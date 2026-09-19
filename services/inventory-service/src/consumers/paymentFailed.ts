import { prisma, Prisma } from "../db/prisma.js";
import { releaseOrderReservationsTx } from "../db/stock.repository.js";

// Saga compensation: payment failed AFTER inventory was reserved, so return
// the order's active reservations to sellable stock and emit
// inventory.released. Stock restore + reservation flip + outbox row commit in
// one Prisma transaction; the idempotency key dedupes Kafka redelivery.
export async function processPaymentFailed(
  idempotencyKey: string,
  event: { orderId: string; reason?: string; code?: string },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dup = await tx.processedEvent.findUnique({
      where: { idempotencyKey },
    });
    if (dup) {
      console.log(
        `[skip] already released reservation for order ${event.orderId}`,
      );
      return;
    }

    const lines = await releaseOrderReservationsTx(tx, event.orderId);
    if (lines.length === 0) {
      await tx.processedEvent.create({ data: { idempotencyKey } });
      console.log(
        `[release-skip] no active reservations for order ${event.orderId}`,
      );
      return;
    }

    await tx.outbox.create({
      data: {
        topic: "inventory.released",
        payload: {
          orderId: event.orderId,
          items: lines,
          reason: event.reason ?? "payment failed",
          code: event.code ?? "PAYMENT_FAILED",
          releasedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.processedEvent.create({ data: { idempotencyKey } });
    console.log(`[released] order ${event.orderId} -> inventory.released`);
  });
}
