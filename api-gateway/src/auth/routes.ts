import { Router, type Request, type Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";
import {
  mintAccessToken,
  mintRefreshToken,
  verifyRefreshToken,
} from "./tokens.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["customer", "admin"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
}

const SALT_ROUNDS = 12;
const REFRESH_COOKIE = "refresh_token";

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { email, password, role } = parsed.data;
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const result = await pool.query<UserRow>(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, password_hash, role",
      [email.toLowerCase(), password_hash, role ?? "customer"],
    );
    const user = result.rows[0]!;
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "23505"
    ) {
      res.status(409).json({ error: { message: "Email already registered" } });
      return;
    }
    throw e;
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query<UserRow>(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: { message: "Invalid email or password" } });
    return;
  }

  const accessToken = mintAccessToken(user);
  const refreshToken = mintRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    path: "/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
});

router.post("/refresh", async (req: Request, res: Response) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({ error: { message: "Missing refresh token" } });
    return;
  }

  let sub: string;
  try {
    sub = verifyRefreshToken(token).sub;
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired refresh token" } });
    return;
  }

  const result = await pool.query<UserRow>(
    "SELECT id, email, password_hash, role FROM users WHERE id = $1",
    [sub],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: { message: "User no longer exists" } });
    return;
  }

  res.json({ accessToken: mintAccessToken(user) });
});

export default router;
