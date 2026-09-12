import type { Order } from "@/data/orders";

type Variant = "default" | "success" | "warning" | "danger" | "muted" | "outline";

export function orderBadge(s: Order["status"]): Variant {
  if (s === "Delivered") return "success";
  if (s === "Picking" || s === "Packed" || s === "Shipped") return "warning";
  if (s === "Cancelled") return "danger";
  if (s === "Refunded") return "muted";
  return "outline";
}

export function paymentBadge(p: Order["payment"]): Variant {
  if (p === "Paid") return "success";
  if (p === "Authorised") return "warning";
  if (p === "Failed") return "danger";
  return "muted";
}
