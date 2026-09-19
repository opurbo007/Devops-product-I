import { prisma } from "./prisma.js";

export interface NotificationView {
  id: string;
  orderId: string;
  channel: string;
  template: string;
  payload: unknown;
  createdAt: Date;
}

function toView(n: {
  id: string;
  orderId: string;
  channel: string;
  template: string;
  payload: unknown;
  createdAt: Date;
}): NotificationView {
  return {
    id: n.id,
    orderId: n.orderId,
    channel: n.channel,
    template: n.template,
    payload: n.payload,
    createdAt: n.createdAt,
  };
}

export async function listNotifications(filter: {
  orderId?: string;
  template?: string;
  take?: number;
}): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: {
      ...(filter.orderId ? { orderId: filter.orderId } : {}),
      ...(filter.template ? { template: filter.template } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(filter.take ?? 100, 1), 500),
  });
  return rows.map(toView);
}

export async function getNotification(
  id: string,
): Promise<NotificationView | null> {
  const row = await prisma.notification.findUnique({ where: { id } });
  return row ? toView(row) : null;
}
