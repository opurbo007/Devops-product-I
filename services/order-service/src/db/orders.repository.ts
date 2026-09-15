import { pool } from "./pool.js";

export interface OrderItem {
  sku: string;
  qty: number;
}

export interface Order {
  id: string;
  customer_id: string;
  status: string;
  total: string;
  items: OrderItem[];
  created_at: Date;
  updated_at: Date;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const result = await pool.query<Order>(
    "SELECT id, customer_id, status, total, items, created_at, updated_at FROM orders WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createOrder(
  customerId: string,
  total: number | string,
  items: OrderItem[] = [],
): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query<Order>(
      "INSERT INTO orders (customer_id, total, items) VALUES ($1, $2, $3) RETURNING id, customer_id, status, total, items, created_at, updated_at",
      [customerId, total, JSON.stringify(items)],
    );
    const order = orderResult.rows[0]!;

    await client.query(
      "INSERT INTO outbox (topic, payload) VALUES ($1, $2)",
      ["order.created", JSON.stringify(order)],
    );

    await client.query("COMMIT");
    return order;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
