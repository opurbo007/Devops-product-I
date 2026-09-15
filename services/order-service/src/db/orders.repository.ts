import { pool } from "./pool.js";

export interface Order {
  id: string;
  customer_id: string;
  status: string;
  total: string;
  created_at: Date;
  updated_at: Date;
}

export async function createOrder(
  customerId: string,
  total: number | string,
): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query<Order>(
      "INSERT INTO orders (customer_id, total) VALUES ($1, $2) RETURNING id, customer_id, status, total, created_at, updated_at",
      [customerId, total],
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
