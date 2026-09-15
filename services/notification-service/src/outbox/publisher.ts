import { pool } from "../db/pool.js";
import { producer, connectProducer } from "../kafka/producer.js";

// Same outbox pattern as order-service / inventory-service.
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
              "ce-source": "notification-service",
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