import type { Product } from "@/data/products";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

/**
 * Resolve a Product.imageUrl to a loadable src.
 * - https://… → as-is (must be allowlisted in next.config remotePatterns).
 * - /images/<file> → via the gateway: ${API_BASE}/api/inventory/images/<file>.
 * - undefined → null (caller renders the SVG glyph fallback).
 */
export function productImageSrc(product: Pick<Product, "imageUrl">): string | null {
  const url = product.imageUrl?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return `${API_BASE}${url}`;
  if (url.startsWith("/images/")) return `${API_BASE}/api/inventory${url}`;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/api/inventory/images/${url}`;
}
