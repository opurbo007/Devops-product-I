import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./auth/routes.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";
import { metricsMiddleware, metricsBody } from "shared-platform";
import { proxyToService } from "./proxy.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8080);
const orderServiceUrl = process.env.ORDER_SERVICE_URL ?? "http://localhost:3000";
const inventoryServiceUrl =
  process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3001";
const shippingServiceUrl =
  process.env.SHIPPING_SERVICE_URL ?? "http://localhost:3002";
const paymentServiceUrl =
  process.env.PAYMENT_SERVICE_URL ?? "http://localhost:3003";
const notificationServiceUrl =
  process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3004";
const cartServiceUrl = process.env.CART_SERVICE_URL ?? "http://localhost:3005";

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001").split(","),
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(cookieParser());

app.use(metricsMiddleware("api-gateway"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/metrics", async (_req, res) => {
  try {
    const { contentType, body } = await metricsBody();
    res.setHeader("Content-Type", contentType);
    res.send(body);
  } catch {
    res.status(500).json({ error: { message: "Metrics unavailable" } });
  }
});

app.use("/auth", express.json(), authLimiter, authRoutes);

// Per-service routes. Each mount strips its prefix so downstream services see
// their native paths (e.g. GET /api/inventory/stock -> inventory GET /stock).
// Auth runs first everywhere; backends additionally verify the internal JWT.
app.use("/api", apiLimiter);

// Aggregate health for the ops dashboard: fans out to each downstream
// /health (public on every service) with a 5s timeout. Never 500s — a down
// service reports ok:false so the dashboard can render it red.
const serviceTargets: Record<string, string> = {
  orders: orderServiceUrl,
  inventory: inventoryServiceUrl,
  shipping: shippingServiceUrl,
  payments: paymentServiceUrl,
  notifications: notificationServiceUrl,
  cart: cartServiceUrl,
};

app.get("/api/health/:service", requireAuth, async (req, res) => {
  const target = serviceTargets[req.params.service as string];
  if (!target) {
    res.status(404).json({ error: { message: "Unknown service" } });
    return;
  }
  try {
    const r = await fetch(`${target}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    res.status(r.ok ? 200 : 502).json({
      ...body,
      ok: r.ok,
      service: req.params.service,
    });
  } catch {
    res
      .status(502)
      .json({ ok: false, service: req.params.service, status: "down" });
  }
});
app.use("/api/inventory", requireAuth, proxyToService(inventoryServiceUrl, "/api/inventory"));
app.use("/api/shipping", requireAuth, proxyToService(shippingServiceUrl, "/api/shipping"));
app.use("/api/payments", requireAuth, proxyToService(paymentServiceUrl, "/api/payments"));
app.use(
  "/api/notifications",
  requireAuth,
  proxyToService(notificationServiceUrl, "/api/notifications"),
);
app.use("/api/cart", requireAuth, proxyToService(cartServiceUrl, "/api/cart", "/cart"));
app.use(
  "/api/recommendations",
  requireAuth,
  proxyToService(cartServiceUrl, "/api/recommendations", "/recommendations"),
);
// Legacy catch-all: order-service owns the remaining /api/* paths
// (GET /api/orders -> order GET /orders). Registered last so the specific
// mounts above take precedence.
app.use("/api", requireAuth, proxyToService(orderServiceUrl, "/api"));

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err instanceof SyntaxError ? 400 : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  console.error(err);
  res.status(status).json({ error: { message } });
});

app.listen(port, () => {
  console.log(`api-gateway listening on port ${port}`);
});
