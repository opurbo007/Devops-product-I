export type ServiceStatus = "Healthy" | "Degraded" | "Down";

export type ServiceEvent = {
  at: string;
  kind: "deploy" | "alert" | "scale" | "restart" | "config";
  text: string;
  tone: "ok" | "warn" | "danger" | "info";
};

export type Replica = {
  name: string;
  node: string;
  uptime: string;
  cpu: number;
  memory: number;
  restarts: number;
};

export type ServiceHealth = {
  slug: string;
  name: string;
  description: string;
  status: ServiceStatus;
  version: string;
  uptime: string;
  cpu: number;
  memory: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
  requestsPerMin: number;
  consumerLagSec: number;
  consumerGroup: string;
  topic: string;
  replicas: number;
  desiredReplicas: number;
  cpuHistory: number[];
  latencyHistory: number[];
  replicaList: Replica[];
  endpoints: { method: string; path: string; p95: number; errorRate: number }[];
  events: ServiceEvent[];
};

export const SERVICES: ServiceHealth[] = [
  {
    slug: "order-service",
    name: "Order Service",
    description: "Order intake, validation and saga orchestration.",
    status: "Healthy",
    version: "v3.2.1",
    uptime: "99.99% · 90d",
    cpu: 42,
    memory: 61,
    latencyP50: 48,
    latencyP95: 132,
    latencyP99: 248,
    errorRate: 0.08,
    requestsPerMin: 342,
    consumerLagSec: 0.4,
    consumerGroup: "order-service-main",
    topic: "order.created",
    replicas: 3,
    desiredReplicas: 3,
    cpuHistory: [31, 34, 29, 38, 41, 44, 39, 42, 47, 43, 40, 42, 45, 41, 38, 44, 46, 42, 39, 43, 41, 42, 44, 42],
    latencyHistory: [98, 104, 92, 110, 121, 128, 115, 132, 140, 126, 118, 132, 136, 124, 112, 130, 138, 132, 120, 128, 125, 132, 135, 132],
    replicaList: [
      { name: "order-service-7d9b4f6c5-x2k4p", node: "eu-west-2a", uptime: "21d 4h", cpu: 40, memory: 59, restarts: 0 },
      { name: "order-service-7d9b4f6c5-m8n1q", node: "eu-west-2b", uptime: "21d 4h", cpu: 44, memory: 62, restarts: 0 },
      { name: "order-service-7d9b4f6c5-t5r7w", node: "eu-west-2c", uptime: "12d 9h", cpu: 42, memory: 61, restarts: 1 },
    ],
    endpoints: [
      { method: "POST", path: "/v1/orders", p95: 168, errorRate: 0.11 },
      { method: "GET", path: "/v1/orders/:id", p95: 42, errorRate: 0.02 },
      { method: "POST", path: "/v1/orders/:id/cancel", p95: 96, errorRate: 0.05 },
    ],
    events: [
      { at: "12:31", kind: "deploy", text: "Rolling restart finished — v3.2.1 on 3/3 replicas", tone: "ok" },
      { at: "11:58", kind: "scale", text: "HPA check — 3 replicas, target CPU 60%, actual 42%", tone: "info" },
      { at: "09:12", kind: "config", text: "Saga timeout order.created → 30s (was 20s)", tone: "info" },
      { at: "08:40", kind: "alert", text: "p95 latency breached 150ms for 2 min — auto-resolved", tone: "warn" },
      { at: "Yesterday 17:22", kind: "restart", text: "Replica t5r7w OOMKilled once — heap limit raised to 1Gi", tone: "warn" },
    ],
  },
  {
    slug: "inventory-service",
    name: "Inventory Service",
    description: "Stock reservations, replenishment and availability reads.",
    status: "Degraded",
    version: "v2.14.3",
    uptime: "99.91% · 90d",
    cpu: 78,
    memory: 84,
    latencyP50: 96,
    latencyP95: 412,
    latencyP99: 890,
    errorRate: 1.84,
    requestsPerMin: 518,
    consumerLagSec: 42,
    consumerGroup: "stock-sync",
    topic: "inventory.reserved",
    replicas: 2,
    desiredReplicas: 3,
    cpuHistory: [52, 55, 58, 61, 64, 68, 71, 74, 77, 79, 76, 78, 80, 77, 75, 78, 81, 79, 76, 78, 79, 78, 80, 78],
    latencyHistory: [180, 190, 205, 220, 248, 270, 295, 320, 348, 372, 390, 412, 428, 405, 388, 412, 430, 415, 398, 410, 418, 412, 420, 412],
    replicaList: [
      { name: "inventory-service-5c8a2bd44-k9p2m", node: "eu-west-2a", uptime: "6d 2h", cpu: 81, memory: 86, restarts: 2 },
      { name: "inventory-service-5c8a2bd44-q4z8n", node: "eu-west-2b", uptime: "6d 2h", cpu: 75, memory: 82, restarts: 1 },
    ],
    endpoints: [
      { method: "POST", path: "/v1/reserve", p95: 512, errorRate: 2.41 },
      { method: "POST", path: "/v1/release", p95: 188, errorRate: 0.62 },
      { method: "GET", path: "/v1/availability/:sku", p95: 64, errorRate: 0.09 },
    ],
    events: [
      { at: "11:42", kind: "alert", text: "Consumer lag alert: stock-sync > 30s for 5 min (now 42s)", tone: "danger" },
      { at: "11:58", kind: "deploy", text: "Canary v2.14.3 at 10% — p95 regression vs v2.14.2", tone: "warn" },
      { at: "10:47", kind: "scale", text: "Replica 3/3 CrashLoopBackOff — image pull back-off on 2c", tone: "danger" },
      { at: "09:05", kind: "restart", text: "Replica k9p2m restarted (liveness probe, 2nd this week)", tone: "warn" },
      { at: "Yesterday 16:10", kind: "config", text: "Reservation TTL shortened 30m → 15m to relieve pressure", tone: "info" },
    ],
  },
  {
    slug: "payment-service",
    name: "Payment Service",
    description: "Authorisation, capture, refunds and 3-D Secure.",
    status: "Healthy",
    version: "v1.9.0",
    uptime: "100.00% · 90d",
    cpu: 35,
    memory: 48,
    latencyP50: 112,
    latencyP95: 286,
    latencyP99: 540,
    errorRate: 0.11,
    requestsPerMin: 188,
    consumerLagSec: 0.9,
    consumerGroup: "payment-service-main",
    topic: "payment.completed",
    replicas: 3,
    desiredReplicas: 3,
    cpuHistory: [28, 30, 27, 32, 34, 36, 33, 35, 38, 36, 34, 35, 37, 35, 32, 36, 38, 35, 33, 35, 34, 35, 36, 35],
    latencyHistory: [240, 252, 238, 262, 275, 288, 270, 286, 298, 282, 274, 286, 292, 280, 268, 286, 294, 288, 276, 284, 280, 286, 290, 286],
    replicaList: [
      { name: "payment-service-6f7c9aa81-a1b2c", node: "eu-west-2a", uptime: "34d 7h", cpu: 33, memory: 47, restarts: 0 },
      { name: "payment-service-6f7c9aa81-d4e5f", node: "eu-west-2b", uptime: "34d 7h", cpu: 36, memory: 49, restarts: 0 },
      { name: "payment-service-6f7c9aa81-g7h8i", node: "eu-west-2c", uptime: "34d 7h", cpu: 35, memory: 48, restarts: 0 },
    ],
    endpoints: [
      { method: "POST", path: "/v1/authorize", p95: 312, errorRate: 0.14 },
      { method: "POST", path: "/v1/capture", p95: 198, errorRate: 0.06 },
      { method: "POST", path: "/v1/refunds", p95: 244, errorRate: 0.09 },
    ],
    events: [
      { at: "09:30", kind: "deploy", text: "Deploy v1.9.0 finished — 3/3 replicas, no errors", tone: "ok" },
      { at: "09:31", kind: "config", text: "Stripe webhook secret rotated", tone: "info" },
      { at: "07:15", kind: "alert", text: "Issuer timeout spike (2 min) — retried, 0 lost authorisations", tone: "warn" },
      { at: "Yesterday 14:02", kind: "scale", text: "HPA scaled 2 → 3 at 09:00 peak, held", tone: "info" },
    ],
  },
  {
    slug: "shipping-service",
    name: "Shipping Service",
    description: "Carrier selection, labels, dispatch and tracking.",
    status: "Healthy",
    version: "v2.5.2",
    uptime: "99.98% · 90d",
    cpu: 27,
    memory: 44,
    latencyP50: 62,
    latencyP95: 158,
    latencyP99: 310,
    errorRate: 0.04,
    requestsPerMin: 124,
    consumerLagSec: 1.1,
    consumerGroup: "shipping-service-main",
    topic: "shipping.dispatched",
    replicas: 2,
    desiredReplicas: 2,
    cpuHistory: [22, 24, 21, 25, 27, 29, 26, 27, 30, 28, 26, 27, 29, 27, 24, 28, 30, 27, 25, 27, 26, 27, 28, 27],
    latencyHistory: [132, 140, 128, 146, 152, 160, 148, 158, 166, 156, 150, 158, 162, 155, 144, 158, 164, 159, 150, 157, 154, 158, 160, 158],
    replicaList: [
      { name: "shipping-service-9b3d1ef22-p6q8r", node: "eu-west-2b", uptime: "48d 1h", cpu: 26, memory: 43, restarts: 0 },
      { name: "shipping-service-9b3d1ef22-s9t1u", node: "eu-west-2c", uptime: "48d 1h", cpu: 28, memory: 45, restarts: 0 },
    ],
    endpoints: [
      { method: "POST", path: "/v1/labels", p95: 182, errorRate: 0.05 },
      { method: "POST", path: "/v1/dispatch", p95: 148, errorRate: 0.03 },
      { method: "GET", path: "/v1/tracking/:id", p95: 58, errorRate: 0.01 },
    ],
    events: [
      { at: "10:15", kind: "config", text: "DPD rate card updated — no dispatch errors since", tone: "ok" },
      { at: "08:02", kind: "scale", text: "HPA check — 2 replicas, utilisation 27%, stable", tone: "info" },
      { at: "Yesterday 18:44", kind: "deploy", text: "Deploy v2.5.2 finished (tracking cache TTL 60s)", tone: "ok" },
    ],
  },
  {
    slug: "cart-service",
    name: "Cart Service",
    description: "Baskets, pricing and cart-recommendation reads.",
    status: "Healthy",
    version: "v1.4.0",
    uptime: "99.97% · 90d",
    cpu: 31,
    memory: 52,
    latencyP50: 28,
    latencyP95: 84,
    latencyP99: 162,
    errorRate: 0.02,
    requestsPerMin: 812,
    consumerLagSec: 0.2,
    consumerGroup: "cart-service-main",
    topic: "cart.updated",
    replicas: 4,
    desiredReplicas: 4,
    cpuHistory: [26, 28, 25, 29, 31, 33, 30, 31, 34, 32, 30, 31, 33, 31, 28, 32, 34, 31, 29, 31, 30, 31, 32, 31],
    latencyHistory: [68, 72, 64, 76, 80, 86, 78, 84, 90, 84, 80, 84, 88, 82, 74, 84, 89, 85, 78, 83, 81, 84, 86, 84],
    replicaList: [
      { name: "cart-service-4a2c8de10-b3c4d", node: "eu-west-2a", uptime: "15d 6h", cpu: 30, memory: 51, restarts: 0 },
      { name: "cart-service-4a2c8de10-e5f6g", node: "eu-west-2a", uptime: "15d 6h", cpu: 32, memory: 53, restarts: 0 },
      { name: "cart-service-4a2c8de10-h7i8j", node: "eu-west-2b", uptime: "15d 6h", cpu: 31, memory: 52, restarts: 0 },
      { name: "cart-service-4a2c8de10-k9l0m", node: "eu-west-2c", uptime: "15d 6h", cpu: 30, memory: 52, restarts: 0 },
    ],
    endpoints: [
      { method: "GET", path: "/v1/cart/:id", p95: 52, errorRate: 0.01 },
      { method: "PUT", path: "/v1/cart/:id/items", p95: 96, errorRate: 0.03 },
      { method: "GET", path: "/v1/recommendations", p95: 118, errorRate: 0.04 },
    ],
    events: [
      { at: "11:20", kind: "scale", text: "HPA scaled 3 → 4 for midday peak, latency flat", tone: "ok" },
      { at: "09:55", kind: "deploy", text: "Deploy v1.4.0 finished — recommendation cache hit 94%", tone: "ok" },
      { at: "Yesterday 13:11", kind: "config", text: "Redis TTL cart: 24h → 12h, memory down 8%", tone: "info" },
    ],
  },
  {
    slug: "notification-service",
    name: "Notification Service",
    description: "Email, SMS and push fan-out with retries and DLQ.",
    status: "Degraded",
    version: "v2.1.6",
    uptime: "99.95% · 90d",
    cpu: 55,
    memory: 58,
    latencyP50: 140,
    latencyP95: 340,
    latencyP99: 720,
    errorRate: 0.31,
    requestsPerMin: 264,
    consumerLagSec: 2.3,
    consumerGroup: "notification-fanout",
    topic: "notification.sent",
    replicas: 2,
    desiredReplicas: 2,
    cpuHistory: [42, 45, 43, 48, 51, 54, 52, 55, 58, 56, 54, 55, 57, 55, 52, 56, 58, 55, 53, 55, 54, 55, 56, 55],
    latencyHistory: [280, 295, 272, 305, 318, 332, 320, 340, 355, 342, 330, 340, 348, 336, 322, 340, 352, 344, 330, 338, 335, 340, 344, 340],
    replicaList: [
      { name: "notification-service-2e6b7ac19-n4o5p", node: "eu-west-2a", uptime: "9d 3h", cpu: 56, memory: 59, restarts: 0 },
      { name: "notification-service-2e6b7ac19-q6r7s", node: "eu-west-2c", uptime: "9d 3h", cpu: 54, memory: 57, restarts: 0 },
    ],
    endpoints: [
      { method: "POST", path: "/v1/send", p95: 368, errorRate: 0.42 },
      { method: "GET", path: "/v1/status/:id", p95: 46, errorRate: 0.01 },
      { method: "POST", path: "/v1/retry/:id", p95: 122, errorRate: 0.18 },
    ],
    events: [
      { at: "12:29", kind: "alert", text: "SMS provider 429s — 14 msgs to DLQ, retry scheduled 13:00", tone: "warn" },
      { at: "11:05", kind: "restart", text: "Worker pool scaled 8 → 16 to drain fan-out backlog", tone: "info" },
      { at: "10:32", kind: "config", text: "Retry backoff 30s → 60s for sms.send", tone: "info" },
      { at: "Yesterday 19:48", kind: "deploy", text: "Deploy v2.1.6 finished (DLQ redrive button)", tone: "ok" },
    ],
  },
];

export function getService(slug: string): ServiceHealth | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function formatLag(sec: number): string {
  if (sec < 1) return `${Math.round(sec * 1000)}ms`;
  if (sec < 60) return `${Number.isInteger(sec) ? sec : sec.toFixed(1)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}
