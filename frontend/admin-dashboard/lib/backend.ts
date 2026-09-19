// Adapters: map live backend DTOs onto the UI shapes the dashboard
// components already render (data/orders.ts, data/inventory.ts, lib/events.ts,
// lib/dlq.ts, data/services.ts). Pages fetch via lib/api and adapt here, so
// tables/sheets/badges keep working unchanged.
import type { Order, OrderStatus, PaymentStatus } from "@/data/orders";
import type { Sku } from "@/data/inventory";
import type { StreamEvent } from "@/lib/events";
import type { DlqEntry } from "@/lib/dlq";
import { SERVICES as MOCK_SERVICES, type ServiceHealth } from "@/data/services";
import type {
  BackendOrder,
  DlqMessage,
  HealthState,
  Notification,
  Payment,
  StockLevel,
} from "./api";

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "Awaiting payment",
  reserved: "Picking",
  paid: "Packed",
  shipped: "Shipped",
  failed: "Awaiting payment",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  completed: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export function toAdminOrder(o: BackendOrder, payment?: Payment | null): Order {
  const created = new Date(o.created_at);
  const ageH = Number.isFinite(created.getTime())
    ? Math.max(0, (Date.now() - created.getTime()) / 3.6e6)
    : 0;
  return {
    id: o.id.slice(0, 8).toUpperCase(),
    backendId: o.id,
    customer: `Customer ${o.customer_id.slice(0, 8)}`,
    email: "",
    town: "",
    items: o.items.map((i) => ({ name: i.sku, qty: i.qty, price: 0 })),
    total: Number(o.total),
    payment: payment
      ? (PAYMENT_STATUS_MAP[payment.status] ?? "Failed")
      : "Authorised",
    payMethod: payment?.providerReference
      ? payment.providerReference.slice(0, 18)
      : "—",
    status: ORDER_STATUS_MAP[o.status] ?? "Awaiting payment",
    ageH,
    created: Number.isFinite(created.getTime())
      ? created.toLocaleString("en-GB")
      : o.created_at,
  };
}

export function toSku(s: StockLevel): Sku {
  return {
    sku: s.sku,
    product: s.sku,
    brand: s.sku.split("-")[0] ?? "",
    category: "—",
    available: s.availableQuantity,
    reserved: s.reserved,
    reorderPoint: 10,
    grade: "New",
    location: "main",
    updatedMin: 0,
  };
}

const TEMPLATE_TOPIC: Record<string, string> = {
  order_confirmation: "order.events",
  order_status: "order.events",
  payment_failure: "payment.events",
  payment_refund: "payment.events",
  shipping_update: "shipping.events",
  reservation_released: "inventory.events",
};

const TOPIC_SERVICE: Record<string, string> = {
  "order.events": "order-service",
  "inventory.events": "inventory-service",
  "payment.events": "payment-service",
  "shipping.events": "shipping-service",
  "notification.events": "notification-service",
};

export function notificationToEvent(n: Notification): StreamEvent {
  const topic = TEMPLATE_TOPIC[n.template] ?? "notification.events";
  const epoch = Date.parse(n.createdAt);
  return {
    id: n.id,
    topic,
    type: n.template.replace(/_/g, "."),
    order: n.orderId.slice(0, 8).toUpperCase(),
    service: TOPIC_SERVICE[topic] ?? "notification-service",
    timestamp: n.createdAt,
    epoch: Number.isFinite(epoch) ? epoch : Date.now(),
    status: "Delivered",
    correlationId: n.orderId,
    causationId: n.id,
    partition: 0,
    offset: 0,
    attempts: 1,
    lagMs: 0,
    payload:
      typeof n.payload === "object" && n.payload !== null
        ? (n.payload as Record<string, unknown>)
        : { value: n.payload },
  };
}

export function toDlqEntry(m: DlqMessage): DlqEntry {
  const failedAt = Date.parse(m.failedAt);
  const value =
    typeof m.value === "object" && m.value !== null
      ? (m.value as Record<string, unknown>)
      : {};
  const order =
    typeof value.orderId === "string" ? value.orderId.slice(0, 8).toUpperCase() : null;
  const orderBackendId =
    typeof value.orderId === "string" ? value.orderId : null;
  return {
    id: m.key || m.dlqTopic,
    topic: m.originalTopic,
    type: m.dlqTopic.replace(/\.DLQ$/, ""),
    order,
    service: m.source || "unknown-service",
    timestamp: m.failedAt,
    epoch: Number.isFinite(failedAt) ? failedAt : Date.now(),
    status: "Dead-letter",
    correlationId: m.key,
    causationId: m.key,
    partition: 0,
    offset: 0,
    attempts: 1,
    lagMs: 0,
    payload: value,
    failureType: "Consumer error",
    error: m.error,
    dlqStatus: "Open",
    orderBackendId,
    firstFailedAt: m.failedAt,
    ageMin: Number.isFinite(failedAt)
      ? Math.max(0, Math.round((Date.now() - failedAt) / 60000))
      : 0,
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
  };
}

const MOCK_SLUG: Record<string, string> = {
  orders: "order",
  inventory: "inventory",
  shipping: "shipping",
  payments: "payment",
  notifications: "notification-service",
  cart: "cart",
};

/** Overlay live status/latency on the static service rows the UI renders. */
export function toServiceHealth(
  slug: string,
  live: HealthState | null,
): ServiceHealth | null {
  const mock = MOCK_SERVICES.find((s) => s.slug === (MOCK_SLUG[slug] ?? slug));
  if (!mock) return null;
  if (!live) return mock;
  return {
    ...mock,
    status: live.ok ? "Healthy" : "Down",
    latencyP95: live.latencyMs ?? mock.latencyP95,
    latencyP50: Math.round(
      live.latencyMs != null ? live.latencyMs * 0.6 : mock.latencyP50,
    ),
  };
}
