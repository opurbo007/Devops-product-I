import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import { pool } from "./db/pool.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3005);
app.use(express.json());

const addItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/cart/:userId", async (req, res) => {
  const userId = req.params.userId;
  const result = await pool.query(
    "SELECT id, user_id, sku, qty, created_at, updated_at FROM cart_items WHERE user_id = $1",
    [userId],
  );
  res.json(result.rows);
});

app.put("/cart/:userId/items", async (req, res) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { sku, qty } = parsed.data;
  const result = await pool.query(
    `INSERT INTO cart_items (user_id, sku, qty)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, sku) DO UPDATE SET qty = $3, updated_at = NOW()
     RETURNING id, user_id, sku, qty, created_at, updated_at`,
    [req.params.userId, sku, qty],
  );
  res.status(201).json(result.rows[0]);
});

app.delete("/cart/:userId/items/:sku", async (req, res) => {
  const result = await pool.query(
    "DELETE FROM cart_items WHERE user_id = $1 AND sku = $2 RETURNING id",
    [req.params.userId, req.params.sku],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: { message: "Cart item not found" } });
    return;
  }
  res.status(204).end();
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err instanceof SyntaxError ? 400 : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  console.error(err);
  res.status(status).json({ error: { message } });
});

app.listen(port, () => {
  console.log(`cart-service listening on port ${port}`);
});