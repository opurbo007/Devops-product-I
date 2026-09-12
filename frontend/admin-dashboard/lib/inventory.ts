import type { Sku, StockStatus } from "@/data/inventory";

export function statusOf(s: Sku): StockStatus {
  if (s.available <= 0) return "Out of stock";
  if (s.available <= s.reorderPoint) return "Low";
  return "In stock";
}

export function totalOf(s: Sku): number {
  return s.available + s.reserved;
}

export function coverOf(s: Sku): string {
  if (s.available <= 0) return "—";
  if (s.available <= 3) return "~2 days";
  if (s.available <= 6) return "~4 days";
  if (s.available <= 12) return "~1 week";
  return "~2+ weeks";
}

export function updatedLabel(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.round(min)} min ago`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export type Reservation = {
  order: string;
  qty: number;
  reservedAt: string;
  expiresIn: string;
  state: "Active" | "Picking" | "Expiring soon";
};

const ORDER_POOL = ["VL-90412", "VL-90410", "VL-90409", "VL-90406", "VL-90402", "VL-90401", "VL-90399", "VL-90397"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic active reservations for a SKU (empty when nothing reserved). */
export function reservationsFor(s: Sku): Reservation[] {
  if (s.reserved <= 0) return [];
  const h = hash(s.sku);
  const count = Math.min(3, Math.max(1, s.reserved > 4 ? 3 : s.reserved > 1 ? 2 : 1));
  let remaining = s.reserved;
  const out: Reservation[] = [];
  for (let i = 0; i < count; i++) {
    const qty = i === count - 1 ? remaining : Math.max(1, Math.floor(s.reserved / count));
    remaining -= qty;
    out.push({
      order: ORDER_POOL[(h + i * 3) % ORDER_POOL.length],
      qty,
      reservedAt: `${8 + ((h + i) % 240)} min ago`,
      expiresIn: i === 0 && s.reserved > 2 ? "42 min" : `${4 + ((h + i * 7) % 20)} h`,
      state: i === 0 && s.reserved > 2 ? "Expiring soon" : i === 1 ? "Picking" : "Active",
    });
  }
  return out;
}

export type StockEvent = {
  kind: "Received" | "Reserved" | "Released" | "Picked" | "Counted" | "Adjusted";
  detail: string;
  by: string;
  at: string;
};

export function eventsFor(s: Sku): StockEvent[] {
  const h = hash(s.sku + "ev");
  const evts: StockEvent[] = [
    { kind: "Reserved", detail: `${Math.max(1, Math.min(3, s.reserved))} unit(s) reserved for ${ORDER_POOL[h % ORDER_POOL.length]}`, by: "order-service", at: updatedLabel(s.updatedMin) },
  ];
  if (s.available < 30) {
    evts.push({ kind: "Picked", detail: `${1 + (h % 3)} unit(s) picked for ${ORDER_POOL[(h + 2) % ORDER_POOL.length]}`, by: "Amara O. (Doncaster)", at: updatedLabel(s.updatedMin + 40 + (h % 120)) });
  }
  evts.push(
    { kind: "Received", detail: `Goods-in: ${10 + (h % 40)} units from ${s.brand} UK distribution`, by: "Goods-in team", at: updatedLabel(s.updatedMin + 300 + (h % 900)) },
    { kind: "Counted", detail: `Cycle count confirmed ${totalOf(s)} units on hand`, by: "Stock team", at: updatedLabel(s.updatedMin + 1400 + (h % 2000)) },
  );
  if (s.grade !== "New") {
    evts.push({ kind: "Adjusted", detail: `Graded ${s.grade} after 40-point refurbishment test`, by: "Refurb lab", at: updatedLabel(s.updatedMin + 3000) });
  }
  return evts;
}
