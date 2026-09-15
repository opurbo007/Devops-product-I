import { pool } from "../db/pool.js";
import { producer, connectProducer } from "../kafka/producer.js";

// Same outbox pattern as order-service: the DB is the source of truth for "what
// happened". Reservation/decline decisions are written to the outbox table inside the
// same transaction as the stock update, so a published inventory.* event always
// reflects committed state. This loop is the only thing that talks to Kafka on the
// produce path: it polls sent = false rows, publishes each to its topic, then marks
// sent = true. Delivery is at-least-once (a crash between send and the UPDATE
// re-publishes); downstream consumers dedupe via the idempotency key carried in the
// message key / ce-id header.
export async function publishOutboxEvents(): Promise<number> {
  await connectProducer();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query<{
      id: string;
      topic: string;
      payload: unknown;
    }>(
      "SELECT id, topic, payload FROM outbox WHERE sent = false ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 100",
    );

    let count = 0;
    for (const row of result.rows) {
      await producer.send({
        topic: row.topic,
        messages: [
          {
            key: row.id,
            value: JSON.stringify(row.payload),
            headers: {
              "ce-type": row.topic,
              "ce-source": "inventory-service",
              "ce-id": row.id,
            },
          },
        ],
      });

      await client.query("UPDATE outbox SET sent = true WHERE id = $1", [
        row.id,
      ]);
      count++;
    }

    await client.query("COMMIT");
    return count;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
