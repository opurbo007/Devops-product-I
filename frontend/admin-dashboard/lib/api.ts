// Typed client for the API gateway (admin dashboard). Same auth mechanics as
// the storefront: Bearer access token + httpOnly refresh cookie, single
// refresh-and-retry on 401, then auth:expired.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface OrderItem {
  sku: string;
  qty: number;
}

export interface BackendOrder {
  id: string;
  customer_id: string;
  status: string;
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  orderId: string;
  status: string;
  amountMinor: number;
  currency: string;
  providerReference: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  dispatchedAt: string;
}

export interface StockLevel {
  sku: string;
  availableQuantity: number;
  reserved: number;
}

export interface StockDetail extends StockLevel {
  reservations: Reservation[];
}

export interface Reservation {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  status: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  orderId: string;
  channel: string;
  template: string;
  payload: unknown;
  createdAt: string;
}

export interface DlqMessage {
  dlqTopic: string;
  originalTopic: string;
  key: string;
  value: unknown;
  source: string;
  error: string;
  failedAt: string;
}

export interface ServiceHealth {
  status: string;
  service: string;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string };
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

// Re-issue an in-memory access token from the httpOnly refresh cookie.
// The access token lives only in module memory, so a page reload wipes it
// while the cookie survives — without this, every post-reload API call goes
// out with no Authorization header ("Missing bearer token").
export async function restoreSession(): Promise<string | null> {
  const fresh = await tryRefresh();
  if (fresh) accessToken = fresh;
  return fresh;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the API — is the gateway running?");
  }

  if (res.status === 401 && accessToken && !retried) {
    const fresh = await tryRefresh();
    if (fresh) {
      accessToken = fresh;
      window.dispatchEvent(
        new CustomEvent<string>("auth:refreshed", { detail: fresh }),
      );
      return apiFetch<T>(path, init, true);
    }
    window.dispatchEvent(new Event("auth:expired"));
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(
      res.status,
      body?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Invalid email or password");
  }
  return (await res.json()) as { accessToken: string; user: AuthUser };
}

// --- Orders ---

export function apiListOrders(status?: string): Promise<BackendOrder[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<BackendOrder[]>(`/api/orders${q}`);
}

export function apiCreateOrder(input: {
  customerId: string;
  total: number;
  items: OrderItem[];
}): Promise<BackendOrder> {
  return apiFetch<BackendOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function apiGetOrder(id: string): Promise<BackendOrder> {
  return apiFetch<BackendOrder>(`/api/orders/${id}`);
}

export function apiCancelOrder(id: string): Promise<BackendOrder> {
  return apiFetch<BackendOrder>(`/api/orders/${id}/cancel`, { method: "POST" });
}

// --- Payments / refunds ---

export function apiListPayments(status?: string): Promise<Payment[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<Payment[]>(`/api/payments${q}`);
}

export function apiGetPaymentByOrder(orderId: string): Promise<Payment> {
  return apiFetch<Payment>(`/api/payments/orders/${orderId}/payment`);
}

export function apiRefundOrder(orderId: string): Promise<unknown> {
  return apiFetch<unknown>(`/api/payments/orders/${orderId}/refund`, {
    method: "POST",
  });
}

// --- Inventory ---

export function apiListStock(): Promise<StockLevel[]> {
  return apiFetch<StockLevel[]>("/api/inventory/stock");
}

export function apiGetStock(sku: string): Promise<StockDetail> {
  return apiFetch<StockDetail>(`/api/inventory/stock/${sku}`);
}

export function apiListReservations(status?: string): Promise<Reservation[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<Reservation[]>(`/api/inventory/reservations${q}`);
}

export function apiAdjustStock(sku: string, delta: number): Promise<StockLevel> {
  return apiFetch<StockLevel>(`/api/inventory/stock/${sku}/adjust`, {
    method: "POST",
    body: JSON.stringify({ delta }),
  });
}

export function apiReleaseOrder(orderId: string): Promise<{
  orderId: string;
  released: number;
  items: { sku: string; qty: number }[];
}> {
  return apiFetch(`/api/inventory/orders/${orderId}/release`, {
    method: "POST",
  });
}

// --- Shipping ---

export function apiListShipments(status?: string): Promise<Shipment[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<Shipment[]>(`/api/shipping/shipments${q}`);
}

export function apiGetShipmentByOrder(orderId: string): Promise<Shipment> {
  return apiFetch<Shipment>(`/api/shipping/orders/${orderId}/shipment`);
}

export function apiGetTracking(trackingNumber: string): Promise<Shipment> {
  return apiFetch<Shipment>(
    `/api/shipping/shipments/tracking/${trackingNumber}`,
  );
}

export function apiDispatchShipment(
  orderId: string,
  input: { carrier?: string; trackingNumber?: string } = {},
): Promise<Shipment & { created: boolean }> {
  return apiFetch(`/api/shipping/orders/${orderId}/dispatch`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function apiUpdateShipment(
  orderId: string,
  update: { status: string; carrier?: string; trackingNumber?: string },
): Promise<Shipment> {
  return apiFetch<Shipment>(`/api/shipping/orders/${orderId}/shipment`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

// --- Notifications (event feed) ---

export function apiListNotifications(
  orderId?: string,
  limit = 100,
): Promise<Notification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (orderId) params.set("orderId", orderId);
  return apiFetch<Notification[]>(`/api/notifications?${params}`);
}

// --- Circuit breakers (chaos playground) ---

export interface CircuitStats {
  state: string;
  failures: number;
  failureThreshold: number;
  timeoutMs: number;
  resetMs: number;
  openedAt: string | null;
}

export function apiGetCircuit(
  service: "payments" | "notifications",
): Promise<{ service: string; provider?: string; circuit: CircuitStats }> {
  return apiFetch(`/api/${service}/admin/circuit`);
}

// Admin-path builder: every service has a dedicated gateway mount that strips
// its prefix ("/api/<svc>" -> "/"), EXCEPT orders, which rides the legacy
// "/api" catch-all (strips only "/api"). So /api/orders/admin/... would reach
// order-service as /orders/admin/... (404) — orders admin calls go to
// /api/admin/... instead.
function svcAdmin(service: DlqService, rest: string): string {
  return service === "orders"
    ? `/api/admin/${rest}`
    : `/api/${service}/admin/${rest}`;
}

export type DlqService =
  | "orders"
  | "inventory"
  | "shipping"
  | "payments"
  | "notifications";

export function apiPeekDlq(
  service: DlqService,
  limit = 100,
): Promise<DlqMessage[]> {
  return apiFetch<DlqMessage[]>(
    `${svcAdmin(service, "dlq")}?limit=${limit}`,
  );
}

export function apiReplayDlq(
  service: DlqService,
  topic: string,
  limit = 100,
): Promise<{ topic: string; replayed: number }> {
  return apiFetch(svcAdmin(service, "dlq/replay"), {
    method: "POST",
    body: JSON.stringify({ topic, limit }),
  });
}

// --- Chaos kill-switches (per service) ---

export function apiGetChaos(
  service: DlqService,
): Promise<{ flags: Record<string, string> }> {
  return apiFetch(svcAdmin(service, "chaos"));
}

export function apiSetChaos(
  service: DlqService,
  flag: string,
  value: string,
): Promise<{ flags: Record<string, string> }> {
  return apiFetch(svcAdmin(service, "chaos"), {
    method: "POST",
    body: JSON.stringify({ flag, value }),
  });
}

/** Flags the dashboard toggles per service. "" value clears the flag. */
export const CHAOS_FLAGS: Record<DlqService, { flag: string; label: string }[]> = {
  orders: [{ flag: "ORDER_FAIL_SAGA", label: "Fail saga tracking" }],
  inventory: [{ flag: "INVENTORY_FAIL_RESERVE", label: "Fail reservations" }],
  shipping: [{ flag: "SHIPPING_FAIL_DISPATCH", label: "Fail dispatch" }],
  payments: [
    { flag: "PAYMENT_DECLINE_CODE", label: "Decline code (e.g. card_declined)" },
    { flag: "PAYMENT_LATENCY_MS", label: "Inject latency ms (e.g. 5000)" },
  ],
  notifications: [{ flag: "NOTIFICATION_FAIL", label: "Fail sends" }],
};

// --- Service health (public, no auth needed) ---

export type HealthSlug =
  | "orders"
  | "inventory"
  | "shipping"
  | "payments"
  | "notifications"
  | "cart";

export interface HealthState {
  slug: HealthSlug | "gateway";
  ok: boolean;
  latencyMs: number | null;
}

export async function fetchServiceHealth(
  slug: HealthState["slug"],
): Promise<HealthState> {
  if (slug === "gateway") {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const started = performance.now();
    try {
      const res = await fetch(`${base}/health`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      return { slug, ok: true, latencyMs: Math.round(performance.now() - started) };
    } catch {
      return { slug, ok: false, latencyMs: null };
    }
  }
  // Aggregated by the gateway (GET /api/health/:service) — needs auth.
  const started = performance.now();
  try {
    const body = await apiFetch<{ ok?: boolean }>(`/api/health/${slug}`);
    return {
      slug,
      ok: body.ok !== false,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch {
    return { slug, ok: false, latencyMs: null };
  }
}
