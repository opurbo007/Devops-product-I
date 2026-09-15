import { pool } from "../db/pool.js";
import { consumer } from "../kafka/consumer.js";

export async function processPaymentCompleted(
  idempotencyKey: string,
  event: { orderId: string },
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query(
      "SELECT 1 FROM processed_events WHERE idempotency_key = $1",
      [idempotencyKey],
    );
    if (dup.rows.length > 0) {
      await client.query("COMMIT");
      console.log(`[skip] already processed payment for order ${event.orderId}`);
      return;
    }

    const carrier = "mock-carrier";
    const trackingNumber = `TRACK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await client.query(
      "INSERT INTO shipments (order_id, status, carrier, tracking_number) VALUES ($1, $2, $3, $4)",
      [event.orderId, "dispatched", carrier, trackingNumber],
    );
    await client.query(
      "INSERT INTO outbox (topic, payload) VALUES ($1, $2)",
      [
        "shipping.dispatched",
        JSON.stringify({
          orderId: event.orderId,
          carrier,
          trackingNumber,
          dispatchedAt: new Date().toISOString(),
        }),
      ],
    );
    await client.query(
      "INSERT INTO processed_events (idempotency_key) VALUES ($1)",
      [idempotencyKey],
    );
    await client.query("COMMIT");
    console.log(`[shipping.dispatched] order ${event.orderId}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.completed", fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] payment.completed key=${idempotencyKey}`);
      try {
        await processPaymentCompleted(idempotencyKey, value);
      } catch (e) {
        console.error("[error] processing payment.completed", e);
      }
    },
  });
  console.log("shipping consumer running");
}