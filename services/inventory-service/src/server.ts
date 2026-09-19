import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import {
  validateInternalAuth,
  requireAdmin,
} from "./middleware/validateInternalAuth.js";
import {
  listStock,
  getStock,
  listReservations,
  adjustStock,
  releaseOrderReservations,
} from "./db/stock.repository.js";
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

// All routes sit behind the gateway's internal JWT (backends never see
// customer tokens). Reads are available to any gateway caller; mutations are
// admin-only (RBAC) — the ops dashboard's inventory management surface.
export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.use(metricsMiddleware("inventory-service"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "inventory-service" });
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

  app.get("/stock", async (_req, res, next) => {
    try {
      res.json(await listStock());
    } catch (e) {
      next(e);
    }
  });

  app.get("/stock/:sku", async (req, res, next) => {
    try {
      const row = await getStock(req.params.sku as string);
      if (!row) {
        res.status(404).json({ error: { message: "SKU not found" } });
        return;
      }
      res.json(row);
    } catch (e) {
      next(e);
    }
  });

  app.get("/reservations", async (req, res, next) => {
    try {
      const filter: { orderId?: string; status?: string } = {};
      if (typeof req.query.orderId === "string") filter.orderId = req.query.orderId;
      if (typeof req.query.status === "string") filter.status = req.query.status;
      res.json(await listReservations(filter));
    } catch (e) {
      next(e);
    }
  });

  const adjustSchema = z.object({
    delta: z
      .number()
      .int()
      .refine((d) => d !== 0, "delta must be non-zero"),
  });

  app.post("/stock/:sku/adjust", requireAdmin, async (req, res) => {
    const parsed = adjustSchema.safeParse(req.body);
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
      res.json(
        await adjustStock(req.params.sku as string, parsed.data.delta),
      );
    } catch (e) {
      res.status(400).json({
        error: { message: e instanceof Error ? e.message : "Adjustment failed" },
      });
    }
  });

  const orderIdParam = z.string().uuid();

  // Manual compensation trigger for ops/DLQ recovery: releases an order's
  // active reservations (idempotent — retries release nothing new).
  app.post("/orders/:orderId/release", requireAdmin, async (req, res) => {
    const parsed = orderIdParam.safeParse(req.params.orderId);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    try {
      const lines = await releaseOrderReservations(parsed.data);
      res.json({ orderId: parsed.data, released: lines.length, items: lines });
    } catch (e) {
      res.status(500).json({
        error: { message: e instanceof Error ? e.message : "Release failed" },
      });
    }
  });

  const DLQ_TOPICS = ["order.created", "payment.failed"].map(dlqTopicFor);
  const CHAOS_FLAGS = ["INVENTORY_FAIL_RESERVE"];

  // Ops: inspect this service's dead-letter queues (peek, no commits).
  app.get("/admin/dlq", async (req, res, next) => {
    try {
      const topics =
        typeof req.query.topic === "string" ? [req.query.topic] : DLQ_TOPICS;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 100;
      res.json(await peekDlq({ clientId: "inventory-service", topics, limit }));
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
        clientId: "inventory-service",
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

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: { message: "Internal Server Error" } });
    },
  );

  return app;
}
