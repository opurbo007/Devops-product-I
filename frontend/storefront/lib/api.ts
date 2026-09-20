// Typed client for the API gateway. Base URL comes from
// NEXT_PUBLIC_API_URL (defaults to local gateway). Auth is Bearer access
// token + httpOnly refresh cookie (credentials: "include"); on 401 the
// client refreshes once and retries before surfacing auth:expired.

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

export interface Order {
  id: string;
  customer_id: string;
  status: string;
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CartRow {
  id: string;
  userId: string;
  sku: string;
  qty: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockLevel {
  sku: string;
  availableQuantity: number;
  reserved: number;
}

export interface Shipment {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  dispatchedAt: string;
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

export interface Notification {
  id: string;
  orderId: string;
  channel: string;
  template: string;
  payload: unknown;
  createdAt: string;
}

export interface Recommendation {
  sku: string;
  score: number;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
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

// --- Auth (no Bearer needed; refresh uses the cookie) ---

export async function apiRegister(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(
      res.status,
      body?.error?.message ?? `Registration failed (${res.status})`,
    );
  }
  return (await res.json()) as AuthUser;
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

export function apiCreateOrder(input: {
  customerId: string;
  total: number;
  items: OrderItem[];
}): Promise<Order> {
  return apiFetch<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function apiGetOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`);
}

export function apiListOrders(customerId: string): Promise<Order[]> {
  return apiFetch<Order[]>(`/api/orders?customerId=${customerId}`);
}

// --- Cart persistence (best-effort server copy of the local basket) ---

export function apiGetCart(userId: string): Promise<CartRow[]> {
  return apiFetch<CartRow[]>(`/api/cart/${userId}`);
}

export function apiPutCartItem(
  userId: string,
  sku: string,
  qty: number,
): Promise<CartRow> {
  return apiFetch<CartRow>(`/api/cart/${userId}/items`, {
    method: "PUT",
    body: JSON.stringify({ sku, qty }),
  });
}

// --- Catalog-adjacent reads ---

export function apiGetStock(sku: string): Promise<StockLevel> {
  return apiFetch<StockLevel>(`/api/inventory/stock/${sku}`);
}

export function apiGetRecommendations(userId: string): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`/api/recommendations/${userId}`);
}

// --- Order tracking ---

export function apiGetShipmentByOrder(orderId: string): Promise<Shipment> {
  return apiFetch<Shipment>(`/api/shipping/orders/${orderId}/shipment`);
}

export function apiGetTracking(trackingNumber: string): Promise<Shipment> {
  return apiFetch<Shipment>(
    `/api/shipping/shipments/tracking/${trackingNumber}`,
  );
}

export function apiGetPaymentByOrder(orderId: string): Promise<Payment> {
  return apiFetch<Payment>(`/api/payments/orders/${orderId}/payment`);
}

export function apiListNotifications(orderId: string): Promise<Notification[]> {
  return apiFetch<Notification[]>(`/api/notifications?orderId=${orderId}`);
}
