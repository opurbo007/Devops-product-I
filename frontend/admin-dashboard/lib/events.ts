export type EventStatus = "Delivered" | "Retrying" | "Dead-letter";

export type StreamEvent = {
  id: string;
  topic: string;
  type: string;
  order: string | null;
  service: string;
  timestamp: string;
  epoch: number;
  status: EventStatus;
  correlationId: string;
  causationId: string;
  partition: number;
  offset: number;
  attempts: number;
  lagMs: number;
  payload: Record<string, unknown>;
};

export const TOPICS = [
  "order.events",
  "inventory.events",
  "payment.events",
  "shipping.events",
  "notification.events",
] as const;

export const SERVICES = [
  "order-service",
  "inventory-service",
  "payment-service",
  "shipping-service",
  "notification-service",
  "cart-recommendation-service",
] as const;

export const TYPES_BY_TOPIC: Record<string, string[]> = {
  "order.events": ["order.created", "order.cancelled", "order.refunded"],
  "inventory.events": ["inventory.reserved", "inventory.released", "stock.level.updated"],
  "payment.events": ["payment.authorised", "payment.completed", "payment.failed", "payment.refunded"],
  "shipping.events": ["shipping.label.created", "shipping.dispatched", "shipping.delivered"],
  "notification.events": ["notification.queued", "notification.sent"],
};

const SERVICE_FOR_TOPIC: Record<string, string> = {
  "order.events": "order-service",
  "inventory.events": "inventory-service",
  "payment.events": "payment-service",
  "shipping.events": "shipping-service",
  "notification.events": "notification-service",
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function hex(h: number, len: number): string {
  let s = "";
  let x = h >>> 0;
  while (s.length < len) {
    s += x.toString(16).padStart(8, "0");
    x = (x * 31 + 0x9e3779b9) >>> 0;
  }
  return s.slice(0, len);
}

function corrFor(seed: string): string {
  const h = hash("corr" + seed);
  return `${hex(h, 8)}-${hex(h >> 3, 4)}-4${hex(h >> 5, 3)}-${hex(h >> 7, 4)}-${hex(h >> 11, 12)}`;
}

const ORDER_POOL = ["VL-90412", "VL-90411", "VL-90410", "VL-90409", "VL-90408", "VL-90406", "VL-90402", "VL-90400", "VL-90399", "VL-90397"];
const TOTALS = [748.0, 1049.0, 512.97, 269.0, 1299.0, 599.0, 628.0, 729.0, 549.0, 479.0];

function payloadFor(type: string, order: string | null, seed: number): Record<string, unknown> {
  const h = hash(type + seed);
  const total = TOTALS[h % TOTALS.length];
  switch (type) {
    case "order.created":
      return { orderId: order, total, currency: "GBP", items: 1 + (h % 3), customerId: `cus_${hex(h, 6)}`, channel: "web" };
    case "order.cancelled":
      return { orderId: order, reason: "customer_request", refundDue: 0 };
    case "order.refunded":
      return { orderId: order, amount: total, currency: "GBP", reason: "30_day_returns" };
    case "inventory.reserved":
      return { orderId: order, sku: ["SNY-WH1000XM5-B", "ASU-VB15-R5", "APL-MBA13M3-MID"][h % 3], qty: 1 + (h % 2), warehouse: "doncaster-dc", ttlSeconds: 1800 };
    case "inventory.released":
      return { orderId: order, reason: "payment_failed", qty: 1 + (h % 2), warehouse: "doncaster-dc" };
    case "stock.level.updated":
      return { sku: ["JBL-FLIP6-BLK", "SAM-S25-128", "PHI-50PUS-4K"][h % 3], onHand: 5 + (h % 40), warehouse: "doncaster-dc" };
    case "payment.authorised":
      return { orderId: order, amount: total, currency: "GBP", method: "visa", authCode: `${100000 + (h % 899999)}` };
    case "payment.completed":
      return { orderId: order, amount: total, currency: "GBP", capturedAt: "2026-09-12T12:41:08Z", provider: "stripe" };
    case "payment.failed":
      return { orderId: order, amount: total, currency: "GBP", code: "card_declined", declineCode: "51", attempt: 1 + (h % 3) };
    case "payment.refunded":
      return { orderId: order, amount: total, currency: "GBP", providerRefundId: `re_${hex(h, 8)}` };
    case "shipping.label.created":
      return { orderId: order, carrier: "dpd", service: "next-day", parcels: 1, weightKg: 2.4 };
    case "shipping.dispatched":
      return { orderId: order, carrier: "dpd", tracking: `1550 4455 ${(h % 9000) + 1000} ${(h % 9000) + 1000}` };
    case "shipping.delivered":
      return { orderId: order, carrier: "dpd", signedBy: "KAUR", deliveredAt: "2026-09-12T11:58:00Z" };
    case "notification.queued":
      return { orderId: order, channel: h % 2 ? "email" : "sms", template: "order_confirmation" };
    case "notification.sent":
      return { orderId: order, channel: h % 2 ? "email" : "sms", template: h % 3 ? "dispatch_confirmation" : "order_confirmation", providerMsgId: `msg_${hex(h, 8)}` };
    default:
      return { orderId: order };
  }
}

const SEQUENCE: [string, string][] = [
  ["order.events", "order.created"],
  ["payment.events", "payment.authorised"],
  ["payment.events", "payment.completed"],
  ["inventory.events", "inventory.reserved"],
  ["shipping.events", "shipping.label.created"],
  ["shipping.events", "shipping.dispatched"],
  ["notification.events", "notification.queued"],
  ["notification.events", "notification.sent"],
  ["order.events", "order.created"],
  ["inventory.events", "inventory.reserved"],
  ["payment.events", "payment.failed"],
  ["inventory.events", "inventory.released"],
  ["order.events", "order.refunded"],
  ["payment.events", "payment.refunded"],
  ["inventory.events", "stock.level.updated"],
  ["shipping.events", "shipping.delivered"],
  ["order.events", "order.cancelled"],
  ["notification.events", "notification.queued"],
];

function statusFor(type: string, i: number): { status: EventStatus; attempts: number } {
  if (type === "payment.failed") return { status: "Retrying", attempts: 2 };
  if (type === "inventory.reserved" && i % 11 === 4) return { status: "Retrying", attempts: 3 };
  if (type === "notification.sent" && i % 13 === 6) return { status: "Dead-letter", attempts: 5 };
  if (type === "stock.level.updated" && i % 9 === 3) return { status: "Retrying", attempts: 2 };
  return { status: "Delivered", attempts: 1 };
}

/** Deterministic backfill: newest first, 12:41:07 backwards. */
export function seedEvents(count = 48): StreamEvent[] {
  const out: StreamEvent[] = [];
  let epoch = Date.UTC(2026, 8, 12, 12, 41, 7);
  for (let i = 0; i < count; i++) {
    const [topic, type] = SEQUENCE[i % SEQUENCE.length];
    const order = type === "stock.level.updated" ? null : ORDER_POOL[i % ORDER_POOL.length];
    const corr = corrFor(`${type}-${Math.floor(i / SEQUENCE.length)}-${order ?? "stock"}`);
    const { status, attempts } = statusFor(type, i);
    const lagMs = type === "inventory.reserved" ? 38000 + (i % 9000) : 200 + ((i * 37) % 2200);
    out.push({
      id: `ev-${epoch}-${i}`,
      topic,
      type,
      order,
      service: SERVICE_FOR_TOPIC[topic],
      timestamp: new Date(epoch).toISOString().slice(11, 19),
      epoch,
      status,
      correlationId: corr,
      causationId: i % 4 === 0 ? corr : corrFor(`cause-${type}-${i}`),
      partition: hash(topic) % 6,
      offset: 4820911 - i * (1 + (i % 3)),
      attempts,
      lagMs,
      payload: payloadFor(type, order, i),
    });
    epoch -= (3 + ((i * 7919) % 47)) * 1000;
  }
  return out;
}

let liveCounter = 0;

/** Next live event (newest) for the simulated stream. */
export function nextLiveEvent(): StreamEvent {
  liveCounter += 1;
  const [topic, type] = SEQUENCE[(liveCounter * 5 + 2) % SEQUENCE.length];
  const order = type === "stock.level.updated" ? null : ORDER_POOL[(liveCounter * 3 + 1) % ORDER_POOL.length];
  const now = new Date();
  const corr = corrFor(`live-${liveCounter}-${type}`);
  return {
    id: `ev-live-${liveCounter}-${now.getTime()}`,
    topic,
    type,
    order,
    service: SERVICE_FOR_TOPIC[topic],
    timestamp: now.toISOString().slice(11, 19),
    epoch: now.getTime(),
    status: type === "payment.failed" ? "Retrying" : "Delivered",
    correlationId: corr,
    causationId: corr,
    partition: hash(topic) % 6,
    offset: 4820912 + liveCounter,
    attempts: 1,
    lagMs: 200 + ((liveCounter * 173) % 1800),
    payload: payloadFor(type, order, liveCounter * 977),
  };
}
