import { prisma, Prisma } from "./prisma.js";

export interface StockLevel {
  sku: string;
  availableQuantity: number;
  reserved: number;
}

export interface ReservationView {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  status: string;
  createdAt: Date;
}

export interface ReleasedLine {
  sku: string;
  qty: number;
}

// Transaction client type for helpers that must run inside the caller's
// prisma.$transaction (saga + outbox atomicity).
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function toReservation(r: {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  status: string;
  createdAt: Date;
}): ReservationView {
  return {
    id: r.id,
    orderId: r.orderId,
    sku: r.sku,
    quantity: r.quantity,
    status: r.status,
    createdAt: r.createdAt,
  };
}

export async function listStock(): Promise<StockLevel[]> {
  const [rows, active] = await Promise.all([
    prisma.stock.findMany({ orderBy: { sku: "asc" } }),
    prisma.reservation.groupBy({
      by: ["sku"],
      where: { status: "active" },
      _sum: { quantity: true },
    }),
  ]);
  const reservedBySku = new Map(
    active.map((a) => [a.sku, a._sum.quantity ?? 0]),
  );
  return rows.map((r) => ({
    sku: r.sku,
    availableQuantity: r.availableQuantity,
    reserved: reservedBySku.get(r.sku) ?? 0,
  }));
}

export async function getStock(
  sku: string,
): Promise<(StockLevel & { reservations: ReservationView[] }) | null> {
  const row = await prisma.stock.findUnique({ where: { sku } });
  if (!row) return null;
  const active = await prisma.reservation.findMany({
    where: { sku, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return {
    sku: row.sku,
    availableQuantity: row.availableQuantity,
    reserved: active.reduce((n, r) => n + r.quantity, 0),
    reservations: active.map(toReservation),
  };
}

export async function listReservations(filter: {
  orderId?: string;
  status?: string;
}): Promise<ReservationView[]> {
  const rows = await prisma.reservation.findMany({
    where: {
      ...(filter.orderId ? { orderId: filter.orderId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toReservation);
}

// Admin replenishment / correction. Positive delta creates the SKU when missing;
// negative delta never drives sellable stock below zero.
export async function adjustStock(
  sku: string,
  delta: number,
): Promise<StockLevel> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stock.findUnique({ where: { sku } });
    if (!existing) {
      if (delta < 0) throw new Error(`unknown sku ${sku}`);
      const created = await tx.stock.create({
        data: { sku, availableQuantity: delta },
      });
      return { sku, availableQuantity: created.availableQuantity, reserved: 0 };
    }
    const next = existing.availableQuantity + delta;
    if (next < 0) {
      throw new Error(
        `insufficient stock for ${sku} (have ${existing.availableQuantity}, delta ${delta})`,
      );
    }
    const updated = await tx.stock.update({
      where: { sku },
      data: { availableQuantity: next },
    });
    const agg = await tx.reservation.aggregate({
      where: { sku, status: "active" },
      _sum: { quantity: true },
    });
    return {
      sku,
      availableQuantity: updated.availableQuantity,
      reserved: agg._sum.quantity ?? 0,
    };
  });
}

// Saga compensation core: return an order's ACTIVE reservations to sellable
// stock and flip them to `released`. Runs inside the caller's transaction so
// the stock write + status flip + outbox row commit atomically. Naturally
// idempotent — a retry finds no active rows and releases nothing.
export async function releaseOrderReservationsTx(
  tx: TxClient,
  orderId: string,
): Promise<ReleasedLine[]> {
  const active = await tx.reservation.findMany({
    where: { orderId, status: "active" },
  });
  for (const r of active) {
    await tx.stock.upsert({
      where: { sku: r.sku },
      update: { availableQuantity: { increment: r.quantity } },
      create: { sku: r.sku, availableQuantity: r.quantity },
    });
  }
  if (active.length > 0) {
    await tx.reservation.updateMany({
      where: { orderId, status: "active" },
      data: { status: "released" },
    });
  }
  return active.map((r) => ({ sku: r.sku, qty: r.quantity }));
}

// Manual/ops-triggered release (HTTP): same core as the Kafka compensation
// path, plus an inventory.released outbox row when anything was released.
export async function releaseOrderReservations(
  orderId: string,
): Promise<ReleasedLine[]> {
  return prisma.$transaction(async (tx) => {
    const lines = await releaseOrderReservationsTx(tx, orderId);
    if (lines.length > 0) {
      await tx.outbox.create({
        data: {
          topic: "inventory.released",
          payload: {
            orderId,
            items: lines,
            source: "manual",
            releasedAt: new Date().toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return lines;
  });
}
