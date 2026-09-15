import { pool } from "../db/pool.js";
import { consumer } from "../kafka/consumer.js";

export interface OrderItem {
  sku: string;
  qty: number;
}

export async function processOrderCreated(idempotencyKey: string, order: {
  id: string;
  customer_id: string;
  items?: OrderItem[];
}): Promise<void> {
  const items = order.items ?? [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query<{ idempotency_key: string }>(
      "SELECT idempotency_key FROM processed_events WHERE idempotency_key = $1",
      [idempotencyKey],
    );
    if (dup.rows.length > 0) {
      await client.query("COMMIT");
      console.log(`[skip] already processed order ${order.id}`);
      return;
    }

    if (items.length === 0) {
      throw new Error("order.created has no items");
    }

    const inStock: string[] = [];
    const lines: { sku: string; qty: number }[] = [];

    for (const item of items) {
      const stock = await client.query<{ available_quantity: number }>(
        "SELECT available_quantity FROM stock WHERE sku = $1 FOR UPDATE",
        [item.sku],
      );
      if (!stock.rows[0]) {
        throw new Error(`unknown sku ${item.sku}`);
      }
      if (stock.rows[0].available_quantity < item.qty) {
        const fail = await client.query(
          `INSERT INTO outbox (topic, payload) VALUES ($1, $2) RETURNING id`,
          [
            "inventory.failed",
            JSON.stringify({
              orderId: order.id,
              sku: item.sku,
              reason: `insufficient stock for ${item.sku} (have ${stock.rows[0].available_quantity}, need ${item.qty})`,
              code: "INSUFFICIENT_STOCK",
            }),
          ],
        );
        await client.query(
          "INSERT INTO processed_events (idempotency_key) VALUES ($1)",
          [idempotencyKey],
        );
        await client.query("COMMIT");
        console.log(
          `[insufficient] ${item.sku} -> inventory.failed`, 
          fail.rows[0],
        );
        return;
      }
      inStock.push(item.sku);
      lines.push(item);
    }

    for (const line of lines) {
      await client.query(
        "UPDATE stock SET available_quantity = available_quantity - $1 WHERE sku = $2",
        [line.qty, line.sku],
      );
      await client.query(
        "INSERT INTO reservations (order_id, sku, quantity) VALUES ($1, $2, $3)",
        [order.id, line.sku, line.qty],
      );
    }

    await client.query(
      "INSERT INTO outbox (topic, payload) VALUES ($1, $2)",
      [
        "inventory.reserved",
        JSON.stringify({
          orderId: order.id,
          items,
          warehouse: "main",
          ttlSeconds: 900,
        }),
      ],
    );

    await client.query(
      "INSERT INTO processed_events (idempotency_key) VALUES ($1)",
      [idempotencyKey],
    );

    await client.query("COMMIT");
    console.log(`[reserved] order ${order.id} -> inventory.reserved`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({
    topic: "order.created",
    fromBeginning: true,
  });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] order.created key=${idempotencyKey}`);
      try {
        await processOrderCreated(idempotencyKey, value);
      } catch (e) {
        console.error("[error] processing order.created", e);
      }
    },
  });
  console.log("inventory consumer running");
}