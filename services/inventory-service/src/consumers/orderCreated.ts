import { prisma, Prisma } from "../db/prisma.js";

export interface OrderItem {
  sku: string;
  qty: number;
}

export async function processOrderCreated(idempotencyKey: string, order: {
  id: string;
  customer_id: string;
  items?: OrderItem[];
  /** Order total (decimal string) — forwarded so payment charges the real amount. */
  total?: unknown;
}): Promise<void> {
  const items = order.items ?? [];

  if (items.length === 0) {
    throw new Error("order.created has no items");
  }

  // Chaos kill-switch (mirrors PAYMENT_DECLINE_CODE / NOTIFICATION_FAIL):
  // INVENTORY_FAIL_RESERVE=1 forces the reserve path to fail so the admin
  // dashboard can exercise retry/DLQ/compensation behavior on demand.
  if (process.env.INVENTORY_FAIL_RESERVE === "1") {
    throw new Error("forced reservation failure (INVENTORY_FAIL_RESERVE=1)");
  }

  // Lock stock rows in deterministic order to avoid deadlocks between
  // concurrent orders touching the same SKUs.
  const sorted = [...items].sort((a, b) => a.sku.localeCompare(b.sku));

  await prisma.$transaction(async (tx) => {
    const dup = await tx.processedEvent.findUnique({
      where: { idempotencyKey },
    });
    if (dup) {
      console.log(`[skip] already processed order ${order.id}`);
      return;
    }

    for (const item of sorted) {
      // Row-level lock: Prisma has no SELECT ... FOR UPDATE API, so lock
      // via raw SQL on the transaction client, then mutate via ORM.
      const rows = await tx.$queryRaw<{ sku: string; available_quantity: number }[]>`
        SELECT sku, available_quantity FROM stock WHERE sku = ${item.sku} FOR UPDATE
      `;
      const stock = rows[0];
      if (!stock) {
        throw new Error(`unknown sku ${item.sku}`);
      }
      if (stock.available_quantity < item.qty) {
        await tx.outbox.create({
          data: {
            topic: "inventory.failed",
            payload: {
              orderId: order.id,
              sku: item.sku,
              reason: `insufficient stock for ${item.sku} (have ${stock.available_quantity}, need ${item.qty})`,
              code: "INSUFFICIENT_STOCK",
            },
          },
        });
        await tx.processedEvent.create({ data: { idempotencyKey } });
        console.log(`[insufficient] ${item.sku} -> inventory.failed`);
        return;
      }
    }

    for (const line of sorted) {
      await tx.stock.update({
        where: { sku: line.sku },
        data: { availableQuantity: { decrement: line.qty } },
      });
      await tx.reservation.create({
        data: { orderId: order.id, sku: line.sku, quantity: line.qty },
      });
    }

    await tx.outbox.create({
      data: {
        topic: "inventory.reserved",
        payload: {
          orderId: order.id,
          items,
          total: order.total ?? null,
          warehouse: "main",
          ttlSeconds: 900,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.processedEvent.create({ data: { idempotencyKey } });

    console.log(`[reserved] order ${order.id} -> inventory.reserved`);
  });
}
