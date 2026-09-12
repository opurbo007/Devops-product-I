export const PIPELINE = [
  { label: "Awaiting payment", count: 6 },
  { label: "Awaiting fulfilment", count: 18 },
  { label: "In transit", count: 42 },
  { label: "Failed events (24h)", count: 3 },
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
  { id: "VL-90407", customer: "Chris Patterson — Newcastle", items: 1, total: "£129.00", status: "Refunded", updated: "3 h ago" },
];

export type ServiceRow = {
  name: string;
  repo: string;
  status: "Operational" | "Degraded" | "Down";
  latency: string;
  errorRate: string;
};

export const SERVICES: ServiceRow[] = [
  { name: "order-service", repo: "services/order-service", status: "Operational", latency: "84ms", errorRate: "0.02%" },
  { name: "payment-service", repo: "services/payment-service", status: "Operational", latency: "142ms", errorRate: "0.11%" },
  { name: "inventory-service", repo: "services/inventory-service", status: "Degraded", latency: "610ms", errorRate: "1.84%" },
  { name: "shipping-service", repo: "services/shipping-service", status: "Operational", latency: "96ms", errorRate: "0.04%" },
  { name: "notification-service", repo: "services/notification-service", status: "Operational", latency: "210ms", errorRate: "0.31%" },
  { name: "cart-recommendation-service", repo: "services/cart-recommendation-service", status: "Operational", latency: "77ms", errorRate: "0.01%" },
];

export type EventRow = {
  type: string;
  order: string;
  service: string;
  time: string;
  state: "Delivered" | "Retrying" | "Dead-letter";
};

export const RECENT_EVENTS: EventRow[] = [
  { type: "PaymentAuthorised", order: "VL-90412", service: "payment-service", time: "12:41:07", state: "Delivered" },
  { type: "InventoryReserved", order: "VL-90412", service: "inventory-service", time: "12:41:09", state: "Delivered" },
  { type: "ShipmentLabelCreated", order: "VL-90410", service: "shipping-service", time: "12:38:52", state: "Delivered" },
  { type: "StockLevelUpdated", order: "—", service: "inventory-service", time: "12:37:14", state: "Retrying" },
  { type: "RefundIssued", order: "VL-90407", service: "payment-service", time: "12:31:48", state: "Delivered" },
  { type: "NotificationSent", order: "VL-90409", service: "notification-service", time: "12:29:03", state: "Dead-letter" },
];
