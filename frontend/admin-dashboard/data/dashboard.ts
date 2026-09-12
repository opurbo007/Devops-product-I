export type Stat = {
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
  note: string;
};

export const STATS: Stat[] = [
  { label: "Orders today", value: "142", delta: "+12.4%", up: true, note: "vs yesterday" },
  { label: "Revenue today", value: "£86,410", delta: "+8.1%", up: true, note: "vs yesterday" },
  { label: "Pending orders", value: "18", delta: "-6", up: true, note: "cleared since 09:00" },
  { label: "Failed payments", value: "5", delta: "+2", up: false, note: "needs review" },
  { label: "Inventory warnings", value: "7", delta: "+3", up: false, note: "low / out of stock" },
  { label: "Active shipments", value: "42", delta: "+9", up: null, note: "in transit" },
];

export type OrderRow = {
  id: string;
  customer: string;
  items: number;
  total: string;
  status: "Awaiting payment" | "Picking" | "Packed" | "Shipped" | "Delivered" | "Refunded";
  updated: string;
};

export const RECENT_ORDERS: OrderRow[] = [
  { id: "VL-90412", customer: "Priya Kaur — Manchester", items: 2, total: "£748.00", status: "Picking", updated: "4 min ago" },
  { id: "VL-90411", customer: "Daniel Whitfield — Leeds", items: 1, total: "£1,049.00", status: "Awaiting payment", updated: "11 min ago" },
  { id: "VL-90410", customer: "Margaret Hughes — Bristol", items: 3, total: "£412.97", status: "Packed", updated: "26 min ago" },
  { id: "VL-90409", customer: "Tom Reid — Glasgow", items: 1, total: "£269.00", status: "Shipped", updated: "1 h ago" },
  { id: "VL-90408", customer: "Aisha Begum — London", items: 2, total: "£1,198.00", status: "Delivered", updated: "2 h ago" },
  { id: "VL-90406", customer: "Sofia Marsh — Birmingham", items: 1, total: "£599.00", status: "Shipped", updated: "3 h ago" },
  { id: "VL-90405", customer: "James Lowe — Sheffield", items: 4, total: "£233.96", status: "Delivered", updated: "4 h ago" },
  { id: "VL-90407", customer: "Chris Patterson — Newcastle", items: 1, total: "£129.00", status: "Refunded", updated: "3 h ago" },
];

/** Today's orders by status — adds to 142. */
export const STATUS_DISTRIBUTION: { status: OrderRow["status"]; count: number }[] = [
  { status: "Delivered", count: 61 },
  { status: "Shipped", count: 34 },
  { status: "Packed", count: 17 },
  { status: "Picking", count: 12 },
  { status: "Awaiting payment", count: 11 },
  { status: "Refunded", count: 7 },
];

export type EventType = {
  type: "order.created" | "inventory.reserved" | "payment.completed" | "shipping.dispatched" | "notification.sent";
  lastHour: number;
  errorRate: string;
  lag: string;
};

export const EVENT_TYPES: EventType[] = [
  { type: "order.created", lastHour: 18, errorRate: "0.00%", lag: "0.4s" },
  { type: "inventory.reserved", lastHour: 17, errorRate: "1.84%", lag: "42s" },
  { type: "payment.completed", lastHour: 16, errorRate: "0.11%", lag: "0.9s" },
  { type: "shipping.dispatched", lastHour: 9, errorRate: "0.04%", lag: "1.1s" },
  { type: "notification.sent", lastHour: 31, errorRate: "0.31%", lag: "2.3s" },
];

/** Events published per hour, last 24h (oldest → newest). */
export const HOURLY_VOLUME = [
  42, 31, 22, 18, 15, 19, 34, 58, 74, 89, 96, 104, 98, 91, 87, 82, 79, 71, 66, 58, 52, 47, 44, 39,
];

export type FeedEvent = {
  type: EventType["type"];
  ref: string;
  time: string;
  state: "Delivered" | "Retrying" | "Dead-letter";
};

export const EVENT_FEED: FeedEvent[] = [
  { type: "order.created", ref: "VL-90412 · £748.00", time: "12:41:07", state: "Delivered" },
  { type: "payment.completed", ref: "VL-90412 · Visa •• 4412", time: "12:41:08", state: "Delivered" },
  { type: "inventory.reserved", ref: "VL-90412 · 2 SKUs", time: "12:41:09", state: "Delivered" },
  { type: "shipping.dispatched", ref: "VL-90410 · DPD", time: "12:38:52", state: "Delivered" },
  { type: "notification.sent", ref: "VL-90410 · dispatch email", time: "12:38:54", state: "Delivered" },
  { type: "inventory.reserved", ref: "VL-90409 · 1 SKU", time: "12:37:14", state: "Retrying" },
  { type: "notification.sent", ref: "VL-90407 · refund SMS", time: "12:29:03", state: "Dead-letter" },
];

export type FailedPayment = {
  order: string;
  customer: string;
  amount: string;
  reason: string;
  attempts: number;
  time: string;
};

export const FAILED_PAYMENTS: FailedPayment[] = [
  { order: "VL-90411", customer: "Daniel Whitfield", amount: "£1,049.00", reason: "Declined — insufficient funds", attempts: 2, time: "11 min ago" },
  { order: "VL-90403", customer: "Nisha Patel", amount: "£429.00", reason: "3-D Secure not completed", attempts: 1, time: "1 h ago" },
  { order: "VL-90398", customer: "Ewan MacLeod", amount: "£899.00", reason: "Declined — suspected fraud", attempts: 3, time: "3 h ago" },
  { order: "VL-90395", customer: "Rob Fenton", amount: "£189.00", reason: "Card expired", attempts: 1, time: "5 h ago" },
  { order: "VL-90391", customer: "Helen Ford", amount: "£549.00", reason: "Issuer unavailable — retry", attempts: 2, time: "6 h ago" },
];

export type StockWarning = {
  sku: string;
  product: string;
  onHand: number;
  cover: string;
  severity: "Out of stock" | "Low";
};

export const STOCK_WARNINGS: StockWarning[] = [
  { sku: "SNY-WH1000XM5-B", product: "Sony WH-1000XM5 · Black", onHand: 0, cover: "Out of stock", severity: "Out of stock" },
  { sku: "APL-MBA13M3-MID", product: "MacBook Air 13\" M3 · Midnight", onHand: 3, cover: "~2 days", severity: "Low" },
  { sku: "LEN-LGN5-4060", product: "Legion 5 RTX 4060 · 1TB", onHand: 4, cover: "~3 days", severity: "Low" },
  { sku: "DYS-V15-ABS", product: "Dyson V15 Detect Absolute", onHand: 5, cover: "~4 days", severity: "Low" },
  { sku: "SAM-GB4-360", product: "Galaxy Book4 360 13\"", onHand: 2, cover: "~2 days", severity: "Low" },
];

export type SystemEvent = { text: string; time: string; tone: "ok" | "warn" | "info" };

export const SYSTEM_EVENTS: SystemEvent[] = [
  { text: "inventory-service deploy v2.14.3 finished (canary 10%)", time: "11:58", tone: "info" },
  { text: "Consumer lag alert: stock-sync > 30s for 5 min", time: "11:42", tone: "warn" },
  { text: "API key rotated: storefront-prod", time: "10:15", tone: "ok" },
  { text: "payment-service deploy v1.9.0 finished", time: "09:30", tone: "ok" },
];
