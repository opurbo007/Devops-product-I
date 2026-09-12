import type { Order } from "@/data/orders";

export type FlowState = "done" | "failed" | "compensated" | "pending" | "skipped";

export type FlowEvent = {
  type: string;
  service: string;
  state: FlowState;
  at: string;
  detail: string;
  compensation?: boolean;
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function mins(base: string, offsetMin: number): string {
  return `${base} +${offsetMin}m`;
}

/**
 * Builds the saga lifecycle for an order.
 * Happy path: order.created → inventory.reserved → payment.completed
 *   → shipping.dispatched → notification.sent
 * Failure path: payment.failed → inventory.release (compensation)
 */
export function buildFlow(order: Order): FlowEvent[] {
  const t0 = order.created;
  const skus = order.items.reduce((n, i) => n + i.qty, 0);
  const failed = order.payment === "Failed";
  const cancelled = order.status === "Cancelled";
  const refunded = order.payment === "Refunded" || order.payment === "Partially refunded";
  const authorisedOnly = order.payment === "Authorised";

  const flow: FlowEvent[] = [
    {
      type: "order.created",
      service: "order-service",
      state: "done",
      at: t0,
      detail: `Order placed · ${skus} item${skus === 1 ? "" : "s"} · ${order.payMethod}`,
    },
  ];

  if (cancelled) {
    flow.push({
      type: "order.cancelled",
      service: "order-service",
      state: "done",
      at: mins(t0, 9),
      detail: "Cancelled by customer before fulfilment — no charges made",
    });
    return flow;
  }

  flow.push({
    type: "inventory.reserved",
    service: "inventory-service",
    state: "done",
    at: mins(t0, 1),
    detail: `${skus} unit${skus === 1 ? "" : "s"} reserved at Doncaster DC`,
  });

  if (failed) {
    flow.push(
      {
        type: "payment.failed",
        service: "payment-service",
        state: "failed",
        at: mins(t0, 2),
        detail: paymentFailureDetail(order),
      },
      {
        type: "inventory.release",
        service: "inventory-service",
        state: "compensated",
        at: mins(t0, 3),
        detail: `Reservation released — ${skus} unit${skus === 1 ? "" : "s"} returned to sellable stock`,
        compensation: true,
      }
    );
    return flow;
  }

  flow.push({
    type: "payment.completed",
    service: "payment-service",
    state: authorisedOnly ? "pending" : "done",
    at: authorisedOnly ? "—" : mins(t0, 2),
    detail: authorisedOnly
      ? `Authorised ${gbpShort(order.total)} — capture on dispatch`
      : `Captured ${gbpShort(order.total)} via ${order.payMethod}`,
  });

  if (authorisedOnly) {
    flow.push(
      { type: "shipping.dispatched", service: "shipping-service", state: "skipped", at: "—", detail: "Waiting for payment capture" },
      { type: "notification.sent", service: "notification-service", state: "skipped", at: "—", detail: "Waiting for payment capture" }
    );
    return flow;
  }

  const shipped = ["Shipped", "Delivered"].includes(order.status);
  const delivered = order.status === "Delivered";

  flow.push({
    type: "shipping.dispatched",
    service: "shipping-service",
    state: shipped ? "done" : "pending",
    at: shipped ? mins(t0, 95) : "—",
    detail: shipped
      ? `DPD · tracking ${trackingFor(order.id)} · 1 parcel, 2.4kg`
      : "Label created — awaiting carrier collection",
  });

  flow.push({
    type: "notification.sent",
    service: "notification-service",
    state: delivered || shipped ? "done" : "pending",
    at: shipped ? mins(t0, 96) : "—",
    detail: delivered ? "Dispatch + delivery confirmations sent (email, SMS)" : "Dispatch confirmation queued",
  });

  if (refunded) {
    flow.push({
      type: "payment.refunded",
      service: "payment-service",
      state: "done",
      at: mins(t0, 60 * 26),
      detail: `${order.payment === "Partially refunded" ? "Partial refund" : "Full refund"} of ${gbpShort(order.total)} issued — customer notified`,
    });
  }

  return flow;
}

function paymentFailureDetail(order: Order): string {
  const id = order.id;
  if (id === "VL-90411") return "Declined — insufficient funds (code 51) · attempt 2 of 3";
  if (id === "VL-90404") return "3-D Secure challenge not completed · attempt 1 of 3";
  if (id === "VL-90403") return "Declined — suspected fraud (code 59) · held for review";
  if (id === "VL-90395") return "Card expired · attempt 1 of 3";
  if (id === "VL-90391") return "Issuer unavailable — scheduled retry in 4h";
  return "Payment declined — retry scheduled";
}

function gbpShort(v: number): string {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function trackingFor(id: string): string {
  const h = hash(id).toString().padStart(10, "0");
  return `1550 4455 ${h.slice(0, 4)} ${h.slice(4, 8)}`;
}

export type StockLine = {
  name: string;
  qty: number;
  sku: string;
  location: string;
  reservation: "Reserved" | "Released" | "Picked" | "Awaiting payment";
};

export function stockLines(order: Order): StockLine[] {
  const failed = order.payment === "Failed";
  const cancelled = order.status === "Cancelled";
  const picked = ["Packed", "Shipped", "Delivered"].includes(order.status);
  return order.items.map((i, idx) => ({
    name: i.name,
    qty: i.qty,
    sku: skuFor(order.id, i.name, idx),
    location: idx % 2 === 0 ? "Doncaster DC · Aisle 14" : "Doncaster DC · Aisle 22",
    reservation: cancelled || failed ? "Released" : picked ? "Picked" : order.payment === "Paid" ? "Reserved" : "Awaiting payment",
  }));
}

function skuFor(orderId: string, name: string, idx: number): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean);
  const code = ((words[0] ?? "X").slice(0, 3) + (words[1] ?? "X").slice(0, 2)).toUpperCase();
  const num = (hash(orderId + idx) % 900 + 100).toString();
  return `${code}-${num}`;
}

export type ShipInfo = {
  method: string;
  address: string[];
  tracking: string | null;
  dispatchedAt: string | null;
  eta: string;
};

const POSTCODES = ["E2 8DP", "M14 5TQ", "BS8 2LE", "G12 8QQ", "W1U 6ED", "NE1 4LP"];

export function shipInfo(order: Order): ShipInfo {
  const h = hash(order.id);
  const shipped = ["Shipped", "Delivered"].includes(order.status);
  const lines = order.items.reduce((n, i) => n + i.qty, 0);
  return {
    method: order.total >= 500 ? "DPD Next-Day (insured)" : "DPD Standard",
    address: [
      order.customer,
      `${12 + (h % 180)} ${["High Street", "Station Road", "Church Lane", "Victoria Park Road"][h % 4]}`,
      order.town,
      POSTCODES[h % POSTCODES.length],
    ],
    tracking: shipped ? trackingFor(order.id) : null,
    dispatchedAt: shipped ? `${order.created} +95m` : null,
    eta: shipped
      ? order.status === "Delivered"
        ? "Delivered"
        : "Arriving tomorrow before 1pm"
      : `${lines} parcel${lines === 1 ? "" : "s"} · ships within 24h of payment`,
  };
}
