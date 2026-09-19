import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { z } from "zod";
import {
  validateInternalAuth,
  requireAdmin,
} from "./middleware/validateInternalAuth.js";
import {
  getShipmentByOrderId,
  getShipmentByTracking,
  listShipments,
  dispatchShipment,
  updateShipmentStatus,
} from "./db/shipments.repository.js";
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
// customer tokens). Reads (tracking lookups for the storefront order page)
// are available to any gateway caller; dispatch + status writes are
// admin-only (RBAC) — the ops dashboard's fulfillment surface.
export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use(metricsMiddleware("shipping-service"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "shipping-service" });
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

  app.get("/shipments", async (req, res, next) => {
    try {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const take =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined;
      res.json(
        await listShipments({
          ...(status ? { status } : {}),
          ...(take !== undefined && Number.isFinite(take) ? { take } : {}),
        }),
      );
    } catch (e) {
      next(e);
    }
  });

  app.get("/shipments/tracking/:trackingNumber", async (req, res, next) => {
    try {
      const row = await getShipmentByTracking(
        req.params.trackingNumber as string,
      );
      if (!row) {
        res.status(404).json({ error: { message: "Shipment not found" } });
        return;
      }
      res.json(row);
    } catch (e) {
      next(e);
    }
  });

  const orderIdParam = z.string().uuid();

  app.get("/orders/:orderId/shipment", async (req, res) => {
    const parsed = orderIdParam.safeParse(req.params.orderId);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    const row = await getShipmentByOrderId(parsed.data);
    if (!row) {
      res.status(404).json({ error: { message: "Shipment not found" } });
      return;
    }
    res.json(row);
  });

  const dispatchSchema = z.object({
    carrier: z.string().min(1).max(100).optional(),
    trackingNumber: z.string().min(1).max(50).optional(),
  });

  // Manual dispatch trigger for ops/DLQ recovery: ships a paid order that has
  // no shipment yet. Idempotent — already-shipped orders return 200 with
  // created:false instead of a duplicate shipping.dispatched.
  app.post("/orders/:orderId/dispatch", requireAdmin, async (req, res) => {
    const idParsed = orderIdParam.safeParse(req.params.orderId);
    if (!idParsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    const bodyParsed = dispatchSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({
        error: {
          message: "Invalid request body",
          details: bodyParsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    const { shipment, created } = await dispatchShipment(
      idParsed.data,
      bodyParsed.data,
    );
    res.status(created ? 201 : 200).json({ ...shipment, created });
  });

  const statusSchema = z.object({
    status: z.enum(["dispatched", "in_transit", "delivered", "failed"]),
    carrier: z.string().min(1).max(100).optional(),
    trackingNumber: z.string().min(1).max(50).optional(),
  });

  app.patch("/orders/:orderId/shipment", requireAdmin, async (req, res) => {
    const idParsed = orderIdParam.safeParse(req.params.orderId);
    if (!idParsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    const bodyParsed = statusSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({
        error: {
          message: "Invalid request body",
          details: bodyParsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    const row = await updateShipmentStatus(idParsed.data, bodyParsed.data);
    if (!row) {
      res.status(404).json({ error: { message: "Shipment not found" } });
      return;
    }
    res.json(row);
  });

  const DLQ_TOPICS = ["payment.completed"].map(dlqTopicFor);
  const CHAOS_FLAGS = ["SHIPPING_FAIL_DISPATCH"];

  // Ops: inspect this service's dead-letter queues (peek, no commits).
  app.get("/admin/dlq", async (req, res, next) => {
    try {
      const topics =
        typeof req.query.topic === "string" ? [req.query.topic] : DLQ_TOPICS;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 100;
      res.json(await peekDlq({ clientId: "shipping-service", topics, limit }));
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
        clientId: "shipping-service",
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
