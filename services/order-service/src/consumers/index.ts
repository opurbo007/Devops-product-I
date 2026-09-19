import { consumer } from "../kafka/consumer.js";
import { producer, connectProducer } from "../kafka/producer.js";
import { withDlq } from "shared-platform";
import { processSagaEvent } from "./saga.js";

// The orchestrator follows the whole saga: reserve -> pay -> ship plus all
// failure/compensation legs. One group, dispatched by topic.
const TOPICS = [
  "inventory.reserved",
  "inventory.failed",
  "payment.completed",
  "payment.failed",
  "shipping.dispatched",
  "inventory.released",
  "payment.refunded",
] as const;

export async function startConsumers(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topics: [...TOPICS], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] ${topic} key=${idempotencyKey}`);
      // Handler errors go to <topic>.DLQ (never stall the partition); ops
      // replays via POST /admin/dlq/replay.
      await withDlq(
        producer,
        connectProducer,
        "order-service",
        topic,
        idempotencyKey,
        value,
        () => processSagaEvent(idempotencyKey, topic, value),
      );
    },
  });
  console.log(`order saga consumers running (${TOPICS.join(", ")})`);
}

// Back-compat alias.
export { startConsumers as startConsumer };
