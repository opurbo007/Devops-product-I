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
  getPaymentByOrderId,
  listPayments,
  refundPayment,
} from "./db/payments.repository.js";
import { getPaymentProvider } from "./providers/index.js";
import { getCircuitStats } from "./consumers/inventoryReserved.js";
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

// Reads serve the storefront order page (payment status) and the ops
// dashboard; refunds are admin-only. All routes sit behind the gateway's
// internal JWT — backends never see customer tokens.
export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use(metricsMiddleware("payment-service"));

  app.get("/health", (_req, res) => {
    let provider = "unconfigured";
    try {
      provider = getPaymentProvider().name;
    } catch (e) {
      provider = `error: ${e instanceof Error ? e.message : "unknown"}`;
    }
    res.json({ status: "ok", service: "payment-service", provider });
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

  // Chaos playground: live circuit-breaker state for the provider call.
  app.get("/admin/circuit", (_req, res) => {
    let provider = "unconfigured";
    try {
      provider = getPaymentProvider().name;
    } catch {
      provider = "misconfigured";
    }
    res.json({ service: "payment-service", provider, circuit: getCircuitStats() });
  });

  app.use(validateInternalAuth);

  app.get("/payments", async (req, res, next) => {
    try {
      const filter: { status?: string; take?: number } = {};
      if (typeof req.query.status === "string") filter.status = req.query.status;
      if (typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))) {
        filter.take = Number(req.query.limit);
      }
      res.json(await listPayments(filter));
    } catch (e) {
      next(e);
    }
  });

  const orderIdParam = z.string().uuid();

  app.get("/orders/:orderId/payment", async (req, res) => {
    const parsed = orderIdParam.safeParse(req.params.orderId);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    const row = await getPaymentByOrderId(parsed.data);
    if (!row) {
      res.status(404).json({ error: { message: "Payment not found" } });
      return;
    }
    res.json(row);
  });

  // Full refund of a completed payment. The provider refund + status flip to
  // `refunded` + payment.refunded outbox row commit in one transaction.
  app.post("/orders/:orderId/refund", requireAdmin, async (req, res) => {
    const parsed = orderIdParam.safeParse(req.params.orderId);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid order id" } });
      return;
    }
    try {
      const result = await refundPayment(parsed.data);
      if (!result) {
        res.status(404).json({ error: { message: "Payment not found" } });
        return;
      }
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Refund failed";
      const status = message.startsWith("only completed payments")
        ? 409
        : 502;
      res.status(status).json({ error: { message } });
    }
  });

  const DLQ_TOPICS = ["inventory.reserved"].map(dlqTopicFor);
  const CHAOS_FLAGS = ["PAYMENT_DECLINE_CODE", "PAYMENT_LATENCY_MS"];

  // Ops: inspect this service's dead-letter queues (peek, no commits).
  app.get("/admin/dlq", async (req, res, next) => {
    try {
      const topics =
        typeof req.query.topic === "string" ? [req.query.topic] : DLQ_TOPICS;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 100;
      res.json(await peekDlq({ clientId: "payment-service", topics, limit }));
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
        clientId: "payment-service",
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
