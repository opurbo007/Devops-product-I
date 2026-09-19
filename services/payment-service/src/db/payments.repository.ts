import { prisma, Prisma } from "./prisma.js";
import { getPaymentProvider } from "../providers/index.js";

export interface PaymentView {
  id: string;
  orderId: string;
  status: string;
  amountMinor: number;
  currency: string;
  providerReference: string | null;
  createdAt: Date;
}

export interface RefundView {
  payment: PaymentView;
  refundReference: string;
  amountMinor: number;
  refundedAt: string;
}

function toView(p: {
  id: string;
  orderId: string;
  status: string;
  amountMinor: number;
  currency: string;
  providerReference: string | null;
  createdAt: Date;
}): PaymentView {
  return {
    id: p.id,
    orderId: p.orderId,
    status: p.status,
    amountMinor: p.amountMinor,
    currency: p.currency,
    providerReference: p.providerReference,
    createdAt: p.createdAt,
  };
}

export async function getPaymentByOrderId(
  orderId: string,
): Promise<PaymentView | null> {
  const row = await prisma.payment.findUnique({ where: { orderId } });
  return row ? toView(row) : null;
}

export async function listPayments(filter: {
  status?: string;
  take?: number;
}): Promise<PaymentView[]> {
  const rows = await prisma.payment.findMany({
    where: { ...(filter.status ? { status: filter.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(filter.take ?? 100, 1), 500),
  });
  return rows.map(toView);
}

// Admin/ops refund: only completed payments, full amount. The provider call
// runs inside the same transaction as the status flip + outbox write (same
// pattern as the charge path). Returns null when no payment exists.
export async function refundPayment(
  orderId: string,
): Promise<RefundView | null> {
  const provider = getPaymentProvider();
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { orderId } });
    if (!payment) return null;
    if (payment.status !== "completed") {
      throw new Error(
        `only completed payments can be refunded (status=${payment.status})`,
      );
    }

    const result = await provider.refund(
      orderId,
      payment.providerReference,
      payment.amountMinor,
    );
    const updated = await tx.payment.update({
      where: { orderId },
      data: { status: "refunded" },
    });
    await tx.outbox.create({
      data: {
        topic: "payment.refunded",
        payload: {
          orderId,
          provider: provider.name,
          providerReference: payment.providerReference,
          refundReference: result.refundReference,
          amountMinor: result.amountMinor,
          currency: payment.currency,
          refundedAt: result.refundedAt,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return {
      payment: toView(updated),
      refundReference: result.refundReference,
      amountMinor: result.amountMinor,
      refundedAt: result.refundedAt,
    };
  });
}
