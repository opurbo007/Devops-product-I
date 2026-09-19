import { prisma } from "../db/prisma.js";
import { consumer } from "../kafka/consumer.js";
import { producer, connectProducer } from "../kafka/producer.js";
import { withDlq } from "shared-platform";

export async function processPaymentCompleted(
  idempotencyKey: string,
  event: { orderId: string },
): Promise<void> {
  // Chaos kill-switch (mirrors PAYMENT_DECLINE_CODE / INVENTORY_FAIL_RESERVE):
  // SHIPPING_FAIL_DISPATCH=1 forces the dispatch path to fail before any DB
  // write, so the admin dashboard can exercise retry/DLQ behavior on demand.
  // Thrown outside the transaction: nothing is recorded, the message is
  // retried until the switch is lifted.
  if (process.env.SHIPPING_FAIL_DISPATCH === "1") {
    throw new Error("forced dispatch failure (SHIPPING_FAIL_DISPATCH=1)");
  }

  await prisma.$transaction(async (tx) => {
    const dup = await tx.processedEvent.findUnique({
      where: { idempotencyKey },
    });
    if (dup) {
      console.log(`[skip] already processed payment for order ${event.orderId}`);
      return;
    }

    const carrier = "mock-carrier";
    const trackingNumber = `TRACK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await tx.shipment.create({
      data: {
        orderId: event.orderId,
        status: "dispatched",
        carrier,
        trackingNumber,
      },
    });
    await tx.outbox.create({
      data: {
        topic: "shipping.dispatched",
        payload: {
          orderId: event.orderId,
          carrier,
          trackingNumber,
          dispatchedAt: new Date().toISOString(),
        },
      },
    });
    await tx.processedEvent.create({ data: { idempotencyKey } });
    console.log(`[shipping.dispatched] order ${event.orderId}`);
  });
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.completed", fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const idempotencyKey = message.key?.toString() ?? "";
      const value = JSON.parse(message.value?.toString() ?? "{}");
      console.log(`[in] payment.completed key=${idempotencyKey}`);
      await withDlq(
        producer,
        connectProducer,
        "shipping-service",
        "payment.completed",
        idempotencyKey,
        value,
        () => processPaymentCompleted(idempotencyKey, value),
      );
    },
  });
  console.log("shipping consumer running");
}
