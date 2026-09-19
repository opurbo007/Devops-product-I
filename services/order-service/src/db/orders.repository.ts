import { prisma, Prisma } from "./prisma.js";

export interface OrderItem {
  sku: string;
  qty: number;
}

export interface Order {
  id: string;
  customer_id: string;
  status: string;
  total: string;
  items: OrderItem[];
  created_at: Date;
  updated_at: Date;
}

type OrderRow = {
  id: string;
  customerId: string;
  status: string;
  total: Prisma.Decimal;
  items: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toOrder(o: OrderRow): Order {
  return {
    id: o.id,
    customer_id: o.customerId,
    status: o.status,
    total: o.total.toString(),
    items: (o.items as OrderItem[]) ?? [],
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { id } });
  return order ? toOrder(order) : null;
}

export async function listOrders(filter: {
  customerId?: string;
  status?: string;
  take?: number;
}): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: {
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(filter.take ?? 100, 1), 500),
  });
  return rows.map(toOrder);
}

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`order ${id} not found`);
    this.name = "OrderNotFoundError";
  }
}

export class OrderNotCancellableError extends Error {
  constructor(id: string, status: string) {
    super(
      `order ${id} cannot be cancelled from status ${status} (only pending orders can be cancelled; refund a paid order instead)`,
    );
    this.name = "OrderNotCancellableError";
  }
}

// Customer cancel: only pending orders (nothing reserved/charged yet — later
// stages go through refund/compensation instead, since this service never
// calls other services directly). Emits order.cancelled via the outbox.
export async function cancelOrder(id: string): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new OrderNotFoundError(id);
    if (existing.status !== "pending") {
      throw new OrderNotCancellableError(id, existing.status);
    }
    const updated = await tx.order.update({
      where: { id },
      data: { status: "cancelled" },
    });
    await tx.outbox.create({
      data: {
        topic: "order.cancelled",
        payload: {
          orderId: id,
          at: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return toOrder(updated);
  });
}

export async function createOrder(
  customerId: string,
  total: number | string,
  items: OrderItem[] = [],
): Promise<Order> {
  // Outbox pattern: order + outbox row commit atomically via Prisma transaction.
  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerId,
        total: new Prisma.Decimal(total),
        items: items as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.outbox.create({
      data: {
        topic: "order.created",
        payload: toOrder(order) as unknown as Prisma.InputJsonValue,
      },
    });

    return order;
  });

  return toOrder(created);
}
