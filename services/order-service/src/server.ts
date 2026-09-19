import express from "express";
import { z } from "zod";
import dotenv from "dotenv";
import {
  createOrder,
  getOrderById,
  listOrders,
  cancelOrder,
  OrderNotFoundError,
  OrderNotCancellableError,
} from "./db/orders.repository.js";
import { validateInternalAuth, requireAdmin } from "./middleware/validateInternalAuth.js";
import { producer, connectProducer } from "./kafka/producer.js";
import { metricsMiddleware, metricsBody } from "shared-platform";
import {
  peekDlq,
  replayDlq,
  dlqTopicFor,
  getChaosFlags,
  setChaosFlag,
} from "shared-platform";

dotenv.config();

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  total: z.number().positive().finite(),
  items: z
    .array(z.object({ sku: z.string().min(1), qty: z.number().int().positive() }))
    .default([]),
});

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send({ message: "Hello World" });
  });

  app.use(metricsMiddleware("order-service"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order-service" });
  });

  app.get("/metrics", async (_req, res, next) => {
    try {
      const { contentType, body } = await metricsBody();
      res.setHeader("Content-Type", contentType);
      res.send(body);
    } catch (e) {
      next(e);
    }
  });

  app.use(validateInternalAuth);

  app.get("/orders", async (req, res, next) => {
    try {
      const filter: { customerId?: string; status?: string; take?: number } = {};
      if (typeof req.query.customerId === "string") {
        const parsed = z.string().uuid().safeParse(req.query.customerId);
        if (!parsed.success) {
          res.status(400).json({ error: { message: "Invalid customer id" } });
          return;
        }
        filter.customerId = parsed.data;
      }
      if (typeof req.query.status === "string") filter.status = req.query.status;
      if (typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))) {
        filter.take = Number(req.query.limit);
      }
      res.json(await listOrders(filter));
    } catch (e) {
      next(e);
    }
  });

  app.post("/orders", async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const { customerId, total, items } = parsed.data;
    const order = await createOrder(customerId, total, items);
    res.status(201).json(order);
  });

  const orderIdParam = z.string().uuid();

  app.get("/orders/:id", async (req, res) => {
    const parsed = orderIdParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    const order = await getOrderById(parsed.data);
    if (!order) {
      res.status(404).json({ error: { message: "Order not found" } });
      return;
    }
    res.json(order);
  });

  app.post("/orders/:id/cancel", async (req, res) => {
    const parsed = orderIdParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    try {
      res.json(await cancelOrder(parsed.data));
    } catch (e) {
      if (e instanceof OrderNotFoundError) {
        res.status(404).json({ error: { message: e.message } });
        return;
      }
      if (e instanceof OrderNotCancellableError) {
        res.status(409).json({ error: { message: e.message } });
        return;
      }
      throw e;
    }
  });

  const DLQ_TOPICS = [
    "inventory.reserved",
    "inventory.failed",
    "payment.completed",
    "payment.failed",
    "shipping.dispatched",
    "inventory.released",
    "payment.refunded",
  ].map(dlqTopicFor);
  const CHAOS_FLAGS = ["ORDER_FAIL_SAGA"];

  // Ops: inspect this service's dead-letter queues (peek, no commits).
  app.get("/admin/dlq", async (req, res, next) => {
    try {
      const topics =
        typeof req.query.topic === "string" ? [req.query.topic] : DLQ_TOPICS;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 100;
      res.json(await peekDlq({ clientId: "order-service", topics, limit }));
    } catch (e) {
      next(e);
    }
  });

  // Ops: replay DLQ messages to their original topics (admin-only;
  // downstream idempotency keys make replay safe).
  app.post("/admin/dlq/replay", requireAdmin, async (req, res) => {
    const parsed = z
      .object({
        topic: z.string().min(1),
        limit: z.number().int().positive().max(1000).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const replayed = await replayDlq(producer, connectProducer, {
        clientId: "order-service",
        dlqTopic: parsed.data.topic,
        limit: parsed.data.limit ?? 100,
      });
      res.json({ topic: parsed.data.topic, replayed });
    } catch (e) {
      res.status(502).json({
        error: { message: e instanceof Error ? e.message : "Replay failed" },
      });
    }
  });

  // Chaos kill-switches (admin-only): flip failure flags at runtime, no restart.
  app.get("/admin/chaos", (_req, res) => {
    res.json({ flags: getChaosFlags(CHAOS_FLAGS) });
  });

  app.post("/admin/chaos", requireAdmin, (req, res) => {
    const parsed = z
      .object({ flag: z.string().min(1), value: z.string() })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      res.json({
        flags: setChaosFlag(CHAOS_FLAGS, parsed.data.flag, parsed.data.value),
      });
    } catch (e) {
      res.status(400).json({
        error: { message: e instanceof Error ? e.message : "Invalid flag" },
      });
    }
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error(err);
    res.status(status).json({
      error: {
        message,
      },
    });
  });

  return app;
}
