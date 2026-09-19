import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Validates the INTERNAL JWT minted by the api-gateway (see
// api-gateway/src/auth/internalJwt.ts). This uses a DIFFERENT secret than the
// customer-facing access token: a stolen customer token verifies against the access
// secret, never this one, so it cannot be replayed directly at this service.
// Anything without a valid x-internal-jwt header is rejected — all traffic must come
// through the gateway, which attaches the header in its proxy layer after running
// requireAuth itself.
const INTERNAL_SECRET =
  process.env.JWT_INTERNAL_SECRET ?? "dev-internal-secret-change-me";

export interface InternalUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      internalUser?: InternalUser;
    }
  }
}

export function validateInternalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers["x-internal-jwt"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token) {
    res.status(401).json({ error: { message: "Missing internal credentials" } });
    return;
  }
  try {
    const claims = jwt.verify(token, INTERNAL_SECRET, {
      issuer: "api-gateway",
      audience: "internal-services",
    }) as { sub: string; email: string; role: string };
    req.internalUser = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid internal credentials" } });
  }
}

// RBAC: DLQ replay re-emits events and chaos flags change failure behavior — admin-only.
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.internalUser?.role !== "admin") {
    res.status(403).json({ error: { message: "Admin role required" } });
    return;
  }
  next();
}
