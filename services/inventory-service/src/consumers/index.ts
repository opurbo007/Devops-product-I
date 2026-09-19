import { consumer } from "../kafka/consumer.js";
import { producer, connectProducer } from "../kafka/producer.js";
import { withDlq } from "shared-platform";
import { processOrderCreated } from "./orderCreated.js";
import { processPaymentFailed } from "./paymentFailed.js";

// Single consumer-group dispatcher: one kafkajs consumer subscribes to both
// topics and routes by topic (mirrors notification-service's TOPICS pattern).
// Reserve path (order.created) and compensation path (payment.failed) share
// the group so ordering per partition is preserved.
const TOPICS = ["order.created", "payment.failed"] as const;

export async function startConsumers(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topics: [...TOPICS], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] ${topic} key=${idempotencyKey}`);
      await withDlq(
        producer,
        connectProducer,
        "inventory-service",
        topic,
        idempotencyKey,
        value,
        async () => {
          if (topic === "order.created") {
            await processOrderCreated(idempotencyKey, value);
          } else if (topic === "payment.failed") {
            await processPaymentFailed(idempotencyKey, value);
          } else {
            console.warn(`[warn] no handler for topic ${topic}`);
          }
        },
      );
    },
  });
  console.log(`inventory consumers running (${TOPICS.join(", ")})`);
}

// Back-compat alias for existing entrypoints.
export { startConsumers as startConsumer };
