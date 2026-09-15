import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface AccessClaims {
  sub: string;
  email: string;
  role: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me";
const ACCESS_TTL: NonNullable<SignOptions["expiresIn"]> =
  (process.env.JWT_ACCESS_TTL ?? "15m") as NonNullable<SignOptions["expiresIn"]>;
const REFRESH_TTL: NonNullable<SignOptions["expiresIn"]> =
  (process.env.JWT_REFRESH_TTL ?? "7d") as NonNullable<SignOptions["expiresIn"]>;

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn("WARNING: using dev JWT secrets — set JWT_ACCESS_SECRET/JWT_REFRESH_SECRET in production");
}

export function mintAccessToken(user: { id: string; email: string; role: string }): string {
  const payload: AccessClaims = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function mintRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, ACCESS_SECRET) as AccessClaims;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string };
}
