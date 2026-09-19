import { prisma, Prisma } from "../db/prisma.js";
import { consumer } from "../kafka/consumer.js";
import { producer, connectProducer } from "../kafka/producer.js";
import { withDlq } from "shared-platform";
import { CircuitBreaker } from "../circuitBreaker.js";

const breaker = new CircuitBreaker({
  failureThreshold: Number(process.env.CB_FAILURE_THRESHOLD ?? 3),
  timeoutMs: Number(process.env.CB_TIMEOUT_MS ?? 1_000),
  resetMs: Number(process.env.CB_RESET_MS ?? 10_000),
});

// Ops introspection for the chaos playground (GET /admin/circuit).
export function getCircuitStats() {
  return breaker.getStats();
}

// Mock send: logs the notification, fails if env NOTIFICATION_FAIL is set.
// The circuit breaker wraps this so repeated failures fast-fail after threshold.
async function mockSend(
  orderId: string,
  channel: string,
  template: string,
): Promise<void> {
  if (process.env.NOTIFICATION_FAIL === "1") {
    throw new Error(`mock send failure on channel ${channel}`);
  }
  console.log(
    `[email/SMS] orderId=${orderId} channel=${channel} template=${template}`,
  );
}

function templateFor(eventType: string): string {
  switch (eventType) {
    case "order.created":
      return "order_confirmation";
    case "order.status.changed":
      return "order_status";
    case "payment.failed":
      return "payment_failure";
    case "payment.refunded":
      return "payment_refund";
    case "shipping.dispatched":
      return "shipping_update";
    case "inventory.released":
      return "reservation_released";
    default:
      return "generic";
  }
}

const TOPICS = [
  "order.created",
  "order.status.changed",
  "payment.failed",
  "payment.refunded",
  "shipping.dispatched",
  "inventory.released",
] as const;

export async function processEvent(
  idempotencyKey: string,
  topic: string,
  event: Record<string, unknown>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dup = await tx.processedEvent.findUnique({
      where: { idempotencyKey },
    });
    if (dup) {
      console.log(`[skip] already processed ${topic} key=${idempotencyKey}`);
      return;
    }

    const orderId = (event.orderId ?? "") as string;
    const template = templateFor(topic);
    const channel = "email";

    try {
      await breaker.execute(() => mockSend(orderId, channel, template));
    } catch (e) {
      console.error(
        `[notification] circuit breaker or send failed for ${topic}`,
        e instanceof Error ? e.message : e,
      );
    }

    await tx.notification.create({
      data: {
        orderId,
        channel,
        template,
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.processedEvent.create({ data: { idempotencyKey } });
    console.log(`[notified] orderId=${orderId} template=${template}`);
  });
}

export async function startConsumer(): Promise<void> {
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
        "notification-service",
        topic,
        idempotencyKey,
        value,
        () => processEvent(idempotencyKey, topic, value),
      );
    },
  });
  console.log("notification consumer running");
}
