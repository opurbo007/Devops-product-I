import { createProxyMiddleware, type Options } from "http-proxy-middleware";
import type { RequestHandler } from "express";
import { mintInternalJwt } from "./auth/internalJwt.js";

// Generic reverse proxy to a backend service. requireAuth must run BEFORE this, so
// req.user is populated; we mint a short-lived internal JWT from those claims and
// attach it as a header. Backends trust ONLY this header (their own secret), never
// the customer-facing access token.
export function proxyToService(target: string, pathPrefix: string): RequestHandler {
  const options: Options = {
    target,
    changeOrigin: true,
    pathRewrite: { [`^${pathPrefix}`]: "" },
    on: {
      proxyReq: (proxyReq, req) => {
        const user = (req as { user?: { id: string; email: string; role: string } }).user;
        if (!user) return;
        proxyReq.setHeader("x-internal-jwt", mintInternalJwt(user));
      },
    },
  };
  return createProxyMiddleware(options);
}
