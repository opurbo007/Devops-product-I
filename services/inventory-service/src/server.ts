import express from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
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
import {
  listProducts,
  getProduct,
  upsertProduct,
} from "./db/products.repository.js";
import {
  IMAGE_CHAOS_FLAGS,
  imageServeForcedFail,
  imageUploadForcedFail,
  removeFile,
  toWebp,
  webpSkipped,
} from "./images/pipeline.js";
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
// Exception: /images + GET /products are public so storefront <img> tags and
// catalog reads work without an Authorization header (gateway proxies them
// without requireAuth).
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

  // --- Local image store (lightweight handling; S3/MinIO is the later step) ---
  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const ALLOWED_MIME = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
  ]);

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const ext =
          ALLOWED_MIME.get(file.mimetype) ??
          path.extname(file.originalname).toLowerCase();
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
    },
  });

  // Public: browsers load these via <img> with no auth header.
  // IMAGE_FAIL_SERVE=1 simulates a disk/CDN outage on the read path so
  // Chaos Lab can verify the storefront falls back to the SVG glyph.
  app.use("/images", (req, res, next) => {
    if (imageServeForcedFail()) {
      res.status(502).json({
        error: { message: "Image store unavailable (IMAGE_FAIL_SERVE=1)" },
      });
      return;
    }
    next();
  });
  app.use(
    "/images",
    express.static(uploadDir, {
      maxAge: "7d",
      immutable: true,
      fallthrough: true,
    }),
  );

  // Public catalog reads (gateway proxies them without requireAuth).
  app.get("/products", async (_req, res, next) => {
    try {
      res.json(await listProducts());
    } catch (e) {
      next(e);
    }
  });

  app.get("/products/:sku", async (req, res, next) => {
    try {
      const row = await getProduct(req.params.sku as string);
      if (!row) {
        res.status(404).json({ error: { message: "Product not found" } });
        return;
      }
      res.json(row);
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

  // Admin: set display metadata incl. an external image URL (no upload).
  const productMetaSchema = z.object({
    name: z.string().min(1).max(200).optional().nullable(),
    imageUrl: z
      .string()
      .max(2048)
      .refine(
        (v) => v.startsWith("/images/") || /^https?:\/\//.test(v),
        "imageUrl must be /images/<file> or an http(s) URL",
      )
      .optional()
      .nullable(),
  });

  app.put("/products/:sku", requireAdmin, async (req, res) => {
    const sku = req.params.sku as string;
    if (!sku || sku.length > 120) {
      res.status(400).json({ error: { message: "Invalid SKU" } });
      return;
    }
    const parsed = productMetaSchema.safeParse(req.body);
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
      res.json(await upsertProduct(sku, parsed.data));
    } catch (e) {
      res.status(500).json({
        error: { message: e instanceof Error ? e.message : "Upsert failed" },
      });
    }
  });

  // Admin: upload a product image (multipart field `image`). Converts to
  // WebP for speed, then upserts the product row with /images/<file>.webp.
  // Chaos: IMAGE_FAIL_UPLOAD=1 rejects before conversion; IMAGE_FAIL_WEBP=1
  // crashes conversion; IMAGE_SKIP_WEBP=1 keeps the original (degraded).
  // All failure paths clean up temp files and write no DB row.
  app.post(
    "/products/:sku/image",
    requireAdmin,
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          res.status(400).json({
            error: {
              message:
                err instanceof Error ? err.message : "Image upload failed",
            },
          });
          return;
        }
        next();
      });
    },
    async (req, res) => {
      const sku = req.params.sku as string;
      if (!sku || sku.length > 120) {
        res.status(400).json({ error: { message: "Invalid SKU" } });
        return;
      }
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res
          .status(400)
          .json({ error: { message: "Missing multipart field `image`" } });
        return;
      }
      if (imageUploadForcedFail()) {
        await removeFile(file.path);
        res.status(502).json({
          error: { message: "Image store unavailable (IMAGE_FAIL_UPLOAD=1)" },
        });
        return;
      }
      try {
        let imageUrl: string;
        let converted = false;
        let degraded = false;
        if (file.mimetype === "image/webp" || webpSkipped()) {
          // Already optimal, or degraded mode: keep the original bytes.
          imageUrl = `/images/${file.filename}`;
          degraded = webpSkipped() && file.mimetype !== "image/webp";
        } else {
          const out = await toWebp(uploadDir, file.path);
          imageUrl = `/images/${out.filename}`;
          converted = out.converted;
        }
        const row = await upsertProduct(sku, { imageUrl });
        res.status(201).json({ ...row, converted, degraded });
      } catch (e) {
        await removeFile(file.path);
        const forced =
          e instanceof Error &&
          e.message.includes("IMAGE_FAIL_WEBP");
        res.status(forced ? 502 : 500).json({
          error: { message: e instanceof Error ? e.message : "Upsert failed" },
        });
      }
    },
  );

  const DLQ_TOPICS = ["order.created", "payment.failed"].map(dlqTopicFor);
  const CHAOS_FLAGS = ["INVENTORY_FAIL_RESERVE", ...IMAGE_CHAOS_FLAGS];

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
