import { prisma, claimOutboxRows, markOutboxSent } from "../db/prisma.js";
import { producer, connectProducer } from "../kafka/producer.js";

// Same outbox pattern as order-service: reservation/decline decisions are
// written to the outbox table inside the same transaction as the stock update,
// so a published inventory.* event always reflects committed state. This loop
// is the only thing that talks to Kafka on the produce path. Delivery is
// at-least-once; downstream consumers dedupe via the idempotency key.
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
                "ce-source": "inventory-service",
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
