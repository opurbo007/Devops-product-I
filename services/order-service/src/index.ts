import express from "express";
import { z } from "zod";
import dotenv from "dotenv";
import { createOrder, getOrderById } from "./db/orders.repository.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  total: z.number().positive().finite(),
});

app.get("/", (req, res) => {
  res.send({ message: "Hello World" });
});

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.post("/orders", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        message: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const { customerId, total } = parsed.data;
  const order = await createOrder(customerId, total);
  res.status(201).json(order);
});

app.get("/orders/:id", async (req, res) => {
  const parsed = z.string().uuid().safeParse(req.params.id);
  if (!parsed.success) {
    return res.status(400).json({
      error: { message: "Invalid order id" },
    });
  }
  const order = await getOrderById(parsed.data);
  if (!order) {
    return res.status(404).json({ error: { message: "Order not found" } });
  }
  res.json(order);
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
