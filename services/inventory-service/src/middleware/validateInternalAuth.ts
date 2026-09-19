import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Same contract as order-service: validates the INTERNAL JWT minted by the
// api-gateway (different secret than customer access tokens, issuer +
// audience pinned). All traffic must come through the gateway.
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

// RBAC: mutating ops (stock adjust, manual release) are admin-only.
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
