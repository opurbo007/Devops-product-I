import { pool } from "../db/pool.js";
import { producer, connectProducer } from "../kafka/producer.js";

// Why read from the outbox table instead of publishing to Kafka directly inside createOrder?
//
// Publishing inside createOrder would put Kafka on the hot path of the DB write and
// break atomicity: an order could be committed while the Kafka send fails, or the Kafka
// message could go out while the DB transaction rolls back. There is no transaction
// spanning Postgres and Kafka, so direct publishing leaks order-created events.
//
// The outbox pattern fixes this by making the DB the source of truth for "what happened":
//   - createOrder writes BOTH the order and the outbox row in ONE DB transaction, so a row
//     existing implies the order exists (and vice versa). This is what the repository's
//     BEGIN/COMMIT does.
//   - This publisher is the only thing that talks to Kafka. It polls for sent = false rows
//     and publishes them. Kafka being down only delays delivery — the row just stays
//     unsent and gets retried on the next poll. No event is ever lost.
//   - Delivery is at-least-once: a crash between producer.send() and the sent=true UPDATE
//     re-publishes that row. Downstream consumers dedupe via the idempotency key, so
//     duplicate delivery is safe.
// Net effect: createOrder never touches Kafka and stays fast + transactional; the broker
// only needs to exist asynchronously, decoupled from the write path.
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
              "ce-source": "order-service",
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
