import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessClaims } from "../auth/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessClaims;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Missing bearer token" } });
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}
