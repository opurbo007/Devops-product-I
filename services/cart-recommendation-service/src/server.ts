import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import { prisma } from "./db/prisma.js";
import { getRecommendations } from "./db/recommendations.js";
import { metricsMiddleware, metricsBody } from "shared-platform";
import { validateInternalAuth } from "./middleware/validateInternalAuth.js";

dotenv.config();

const addItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
});

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.use(metricsMiddleware("cart-recommendation-service"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cart-recommendation-service" });
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

  app.get("/cart/:userId", async (req, res) => {
    const rows = await prisma.cartItem.findMany({
      where: { userId: req.params.userId },
    });
    res.json(rows);
  });

  app.put("/cart/:userId/items", async (req, res) => {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { sku, qty } = parsed.data;
    const row = await prisma.cartItem.upsert({
      where: { userId_sku: { userId: req.params.userId as string, sku } },
      update: { qty },
      create: { userId: req.params.userId as string, sku, qty },
    });
    res.status(201).json(row);
  });

  app.delete("/cart/:userId/items/:sku", async (req, res) => {
    const deleted = await prisma.cartItem.deleteMany({
      where: { userId: req.params.userId, sku: req.params.sku },
    });
    if (deleted.count === 0) {
      res.status(404).json({ error: { message: "Cart item not found" } });
      return;
    }
    res.status(204).end();
  });

  app.get("/recommendations/:userId", async (req, res, next) => {
    try {
      const parsed = z.string().uuid().safeParse(req.params.userId);
      if (!parsed.success) {
        res.status(400).json({ error: { message: "Invalid user id" } });
        return;
      }
      const take =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 10;
      res.json(await getRecommendations(parsed.data, take));
    } catch (e) {
      next(e);
    }
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error(err);
    res.status(status).json({ error: { message } });
  });

  return app;
}
