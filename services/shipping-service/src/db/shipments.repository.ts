import { prisma, Prisma } from "./prisma.js";

export interface ShipmentView {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  dispatchedAt: Date;
}

export interface DispatchInput {
  carrier?: string | undefined;
  trackingNumber?: string | undefined;
}

export interface StatusUpdate {
  status: string;
  carrier?: string | undefined;
  trackingNumber?: string | undefined;
}

function toView(s: {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  dispatchedAt: Date;
}): ShipmentView {
  return {
    id: s.id,
    orderId: s.orderId,
    status: s.status,
    carrier: s.carrier,
    trackingNumber: s.trackingNumber,
    dispatchedAt: s.dispatchedAt,
  };
}

function newTrackingNumber(): string {
  return `TRACK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function getShipmentByOrderId(
  orderId: string,
): Promise<ShipmentView | null> {
  const row = await prisma.shipment.findUnique({ where: { orderId } });
  return row ? toView(row) : null;
}

export async function getShipmentByTracking(
  trackingNumber: string,
): Promise<ShipmentView | null> {
  const row = await prisma.shipment.findFirst({
    where: { trackingNumber },
  });
  return row ? toView(row) : null;
}

export async function listShipments(filter: {
  status?: string;
  take?: number;
}): Promise<ShipmentView[]> {
  const rows = await prisma.shipment.findMany({
    where: { ...(filter.status ? { status: filter.status } : {}) },
    orderBy: { dispatchedAt: "desc" },
    take: Math.min(Math.max(filter.take ?? 100, 1), 500),
  });
  return rows.map(toView);
}

// Manual/ops-triggered dispatch (HTTP + DLQ recovery): creates the shipment
// for a paid order that has none. Idempotent — if a shipment already exists
// it is returned untouched and no duplicate shipping.dispatched goes out.
export async function dispatchShipment(
  orderId: string,
  input: DispatchInput = {},
): Promise<{ shipment: ShipmentView; created: boolean }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.shipment.findUnique({ where: { orderId } });
    if (existing) return { shipment: toView(existing), created: false };

    const carrier = input.carrier ?? "mock-carrier";
    const trackingNumber = input.trackingNumber ?? newTrackingNumber();

    const created = await tx.shipment.create({
      data: { orderId, status: "dispatched", carrier, trackingNumber },
    });
    await tx.outbox.create({
      data: {
        topic: "shipping.dispatched",
        payload: {
          orderId,
          carrier,
          trackingNumber,
          source: "manual",
          dispatchedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return { shipment: toView(created), created: true };
  });
}

// Ops status tracking (carrier callbacks / admin dashboard). Returns null
// when no shipment exists for the order.
export async function updateShipmentStatus(
  orderId: string,
  update: StatusUpdate,
): Promise<ShipmentView | null> {
  const existing = await prisma.shipment.findUnique({ where: { orderId } });
  if (!existing) return null;
  const updated = await prisma.shipment.update({
    where: { orderId },
    data: {
      status: update.status,
      ...(update.carrier !== undefined ? { carrier: update.carrier } : {}),
      ...(update.trackingNumber !== undefined
        ? { trackingNumber: update.trackingNumber }
        : {}),
    },
  });
  return toView(updated);
}
