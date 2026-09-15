import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { message: "Not authenticated" } });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: { message: "Admin role required" } });
    return;
  }
  next();
}
