import { prisma, claimOutboxRows, markOutboxSent } from "../db/prisma.js";
import { producer, connectProducer } from "../kafka/producer.js";

// Outbox relay: the DB is the source of truth for "what happened".
// createOrder writes order + outbox row in ONE transaction; this publisher is
// the only thing that talks to Kafka, polling sent=false rows and marking
// them sent after publish. Delivery is at-least-once (crash between send and
// the UPDATE re-publishes); consumers dedupe via the idempotency key.
// Row locking (FOR UPDATE SKIP LOCKED via claimOutboxRows) lets multiple
// publisher replicas poll without double-delivery.
export async function publishOutboxEvents(): Promise<number> {
  await connectProducer();

  return prisma.$transaction(
    async (tx) => {
      const rows = await claimOutboxRows(tx, 100);

      let count = 0;
      for (const row of rows) {
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

        await markOutboxSent(tx, row.id);
        count++;
      }

      return count;
    },
    { maxWait: 5_000, timeout: 30_000 },
  );
}
