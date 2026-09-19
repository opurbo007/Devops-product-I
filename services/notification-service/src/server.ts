import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { z } from "zod";
import { validateInternalAuth, requireAdmin } from "./middleware/validateInternalAuth.js";
import {
  listNotifications,
  getNotification,
} from "./db/notifications.repository.js";
import { producer, connectProducer } from "./kafka/producer.js";
import { getCircuitStats } from "./consumers/index.js";
import { metricsMiddleware, metricsBody } from "shared-platform";
import {
  peekDlq,
  replayDlq,
  dlqTopicFor,
  getChaosFlags,
  setChaosFlag,
} from "shared-platform";

dotenv.config();

// Read-only API: notification history for the storefront order page
// (per-order) and the ops dashboard. Sends are event-driven only — there is
// deliberately no send endpoint (producers emit domain events; this service
// notifies off them). All routes sit behind the gateway's internal JWT.
export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use(metricsMiddleware("notification-service"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "notification-service" });
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

  // Chaos playground: live circuit-breaker state for the mock send.
  app.get("/admin/circuit", (_req, res) => {
    res.json({ service: "notification-service", circuit: getCircuitStats() });
  });

  app.use(validateInternalAuth);

  app.get("/notifications", async (req, res, next) => {
    try {
      const filter: { orderId?: string; template?: string; take?: number } = {};
      if (typeof req.query.orderId === "string") {
        const parsed = z.string().uuid().safeParse(req.query.orderId);
        if (!parsed.success) {
          res.status(400).json({ error: { message: "Invalid order id" } });
          return;
        }
        filter.orderId = parsed.data;
      }
      if (typeof req.query.template === "string") {
        filter.template = req.query.template;
      }
      if (typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))) {
        filter.take = Number(req.query.limit);
      }
      res.json(await listNotifications(filter));
    } catch (e) {
      next(e);
    }
  });

  app.get("/notifications/:id", async (req, res) => {
    const parsed = z.string().uuid().safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid notification id" } });
      return;
    }
    const row = await getNotification(parsed.data);
    if (!row) {
      res.status(404).json({ error: { message: "Notification not found" } });
      return;
    }
    res.json(row);
  });

  const DLQ_TOPICS = [
    "order.created",
    "order.status.changed",
    "payment.failed",
    "payment.refunded",
    "shipping.dispatched",
    "inventory.released",
  ].map(dlqTopicFor);
  const CHAOS_FLAGS = ["NOTIFICATION_FAIL"];

  // Ops: inspect this service's dead-letter queues (peek, no commits).
  app.get("/admin/dlq", async (req, res, next) => {
    try {
      const topics =
        typeof req.query.topic === "string" ? [req.query.topic] : DLQ_TOPICS;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 100;
      res.json(
        await peekDlq({ clientId: "notification-service", topics, limit }),
      );
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
        clientId: "notification-service",
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
