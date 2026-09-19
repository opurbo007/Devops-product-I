import { prisma, Prisma } from "../db/prisma.js";

// Saga state tracking: the order service is the orchestrator, so it follows
// every downstream event and advances the order status. Transitions only move
// forward — terminal states (failed/cancelled/refunded) and repeats are
// recorded as idempotent no-ops, which also makes cross-topic arrival order
// irrelevant (payment.failed vs inventory.released either way ends `failed`).
const TERMINAL = new Set(["failed", "cancelled", "refunded"]);

const TOPIC_STATUS: Record<string, string> = {
  "inventory.reserved": "reserved",
  "inventory.failed": "failed",
  "payment.completed": "paid",
  "payment.failed": "failed",
  "shipping.dispatched": "shipped",
  "inventory.released": "failed",
  "payment.refunded": "refunded",
};

export async function processSagaEvent(
  idempotencyKey: string,
  topic: string,
  event: { orderId: string },
): Promise<void> {
  // Chaos kill-switch: ORDER_FAIL_SAGA=1 forces saga tracking to fail before
  // any DB write, exercising the order-service DLQ + replay path.
  if (process.env.ORDER_FAIL_SAGA === "1") {
    throw new Error("forced saga failure (ORDER_FAIL_SAGA=1)");
  }

  const toStatus = TOPIC_STATUS[topic];
  if (!toStatus) {
    console.warn(`[warn] no saga transition for topic ${topic}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const dup = await tx.processedEvent.findUnique({
      where: { idempotencyKey },
    });
    if (dup) {
      console.log(`[skip] already applied ${topic} for order ${event.orderId}`);
      return;
    }

    const order = await tx.order.findUnique({
      where: { id: event.orderId },
    });
    if (!order) {
      await tx.processedEvent.create({ data: { idempotencyKey } });
      console.log(`[saga-skip] order ${event.orderId} unknown (${topic})`);
      return;
    }
    if (TERMINAL.has(order.status) || order.status === toStatus) {
      await tx.processedEvent.create({ data: { idempotencyKey } });
      console.log(
        `[saga-skip] order ${order.id} already ${order.status} (${topic})`,
      );
      return;
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: toStatus },
    });
    await tx.outbox.create({
      data: {
        topic: "order.status.changed",
        payload: {
          orderId: order.id,
          from: order.status,
          to: toStatus,
          at: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.processedEvent.create({ data: { idempotencyKey } });
    console.log(`[saga] order ${order.id}: ${order.status} -> ${toStatus} (${topic})`);
  });
}
