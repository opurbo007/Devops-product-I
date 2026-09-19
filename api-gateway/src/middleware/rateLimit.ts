import type { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";

// Fixed-window rate limiter. Redis-backed when REDIS_URL is set (shared
// across gateway replicas); otherwise an in-memory fallback. If Redis drops,
// requests transparently fall back to memory instead of failing.
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

let redis: Redis | null = null;
let redisOk = false;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
  });
  redis.on("ready", () => {
    redisOk = true;
    console.log("[ratelimit] redis backing connected");
  });
  const onDown = (e: unknown) => {
    if (redisOk) console.warn("[ratelimit] redis unavailable, memory fallback");
    redisOk = false;
    void e;
  };
  redis.on("error", onDown);
  redis.on("close", () => onDown(undefined));
}

const mem = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of mem) {
    if (v.resetAt <= now) mem.delete(k);
  }
}, 60_000).unref();

export function createRateLimiter(max: number) {
  return async function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const scope = req.path.split("/").slice(0, 3).join("/") || "/";
    const key = `rl:${req.ip}:${scope}`;
    const now = Date.now();
    const window = WINDOW_MS;

    if (redis && redisOk) {
      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, window);
        const ttl = await redis.pttl(key);
        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - count)));
        if (count > max) {
          res.setHeader("Retry-After", String(Math.ceil(ttl / 1000)));
          res.status(429).json({ error: { message: "Too many requests, slow down" } });
          return;
        }
        next();
        return;
      } catch {
        redisOk = false;
      }
    }

    let entry = mem.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + window };
      mem.set(key, entry);
    }
    entry.count++;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((entry.resetAt - now) / 1000)),
      );
      res.status(429).json({ error: { message: "Too many requests, slow down" } });
      return;
    }
    next();
  };
}

// 300 req / 15 min per IP+scope for proxied APIs, 60 for auth endpoints.
export const apiLimiter = createRateLimiter(
  Number(process.env.RATE_LIMIT_API_MAX ?? 300),
);
export const authLimiter = createRateLimiter(
  Number(process.env.RATE_LIMIT_AUTH_MAX ?? 60),
);
