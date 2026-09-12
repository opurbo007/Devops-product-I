"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { catalog } from "@/data/catalog";
import { bestSellers, clearance, type Product } from "@/data/products";

const ALL: Product[] = [...catalog, ...bestSellers, ...clearance];

export function productById(id: string): Product | undefined {
  return ALL.find((p) => p.id === id);
}

export type CartLine = { id: string; qty: number };
export type DeliveryId = "standard" | "nextday" | "collect";

export const DELIVERY_OPTIONS: { id: DeliveryId; label: string; detail: string }[] = [
  { id: "standard", label: "Standard", detail: "2–3 working days" },
  { id: "nextday", label: "Next-day", detail: "Order before 8pm Mon–Fri" },
  { id: "collect", label: "Click & Collect", detail: "Ready in 60 mins, 120+ stores" },
];

const PROMOS: Record<string, { label: string; minSubtotal: number; amount: (sub: number) => number }> = {
  VOLT10: { label: "10% off", minSubtotal: 100, amount: (sub) => Math.round(sub * 0.1 * 100) / 100 },
  WELCOME5: { label: "£5 off", minSubtotal: 50, amount: () => 5 },
};

const STORAGE_KEY = "volt-cart-v1";
const FREE_DELIVERY_THRESHOLD = 50;

type Persisted = { lines: CartLine[]; saved: string[]; promo: string | null; delivery: DeliveryId };

const SEED: Persisted = {
  lines: [
    { id: "asus-vivobook15-r5-16-512", qty: 1 },
    { id: "sony-wh1000xm5", qty: 1 },
  ],
  saved: ["jbl-flip6"],
  promo: null,
  delivery: "standard",
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Persisted;
    if (!Array.isArray(parsed.lines)) return SEED;
    return { ...SEED, ...parsed };
  } catch {
    return SEED;
  }
}

type CartContextValue = Persisted & {
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  promoError: string | null;
  addItem: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  saveForLater: (id: string) => void;
  moveToBasket: (id: string) => void;
  removeSaved: (id: string) => void;
  applyPromo: (code: string) => void;
  clearPromo: () => void;
  setDelivery: (d: DeliveryId) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const MAX_QTY = 5;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(SEED.lines);
  const [saved, setSaved] = useState<string[]>(SEED.saved);
  const [promo, setPromo] = useState<string | null>(SEED.promo);
  const [delivery, setDelivery] = useState<DeliveryId>(SEED.delivery);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = load();
    setLines(s.lines.filter((l) => productById(l.id)));
    setSaved(s.saved.filter((id) => productById(id)));
    setPromo(s.promo);
    setDelivery(s.delivery ?? "standard");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, saved, promo, delivery }));
    } catch {
      /* storage unavailable — cart still works in memory */
    }
  }, [lines, saved, promo, delivery, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, l) => {
      const p = productById(l.id);
      return sum + (p ? p.price * l.qty : 0);
    }, 0);

    const promoDef = promo ? PROMOS[promo] : undefined;
    const discount =
      promoDef && subtotal >= promoDef.minSubtotal ? Math.min(promoDef.amount(subtotal), subtotal) : 0;

    const afterDiscount = subtotal - discount;
    const deliveryFee =
      lines.length === 0
        ? 0
        : delivery === "nextday"
          ? 5.99
          : delivery === "collect"
            ? 0
            : afterDiscount >= FREE_DELIVERY_THRESHOLD
              ? 0
              : 3.99;

    return {
      lines,
      saved,
      promo,
      delivery,
      hydrated,
      itemCount: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      discount,
      deliveryFee,
      total: afterDiscount + deliveryFee,
      promoError,
      addItem: (id, qty = 1) => {
        if (!productById(id)) return;
        setLines((prev) => {
          const found = prev.find((l) => l.id === id);
          if (found) {
            return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
          }
          return [...prev, { id, qty: Math.min(MAX_QTY, qty) }];
        });
        setSaved((prev) => prev.filter((s) => s !== id));
      },
      setQty: (id, qty) => {
        const q = Math.max(1, Math.min(MAX_QTY, qty));
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: q } : l)));
      },
      removeLine: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
      saveForLater: (id) => {
        setLines((prev) => prev.filter((l) => l.id !== id));
        setSaved((prev) => (prev.includes(id) ? prev : [...prev, id]));
      },
      moveToBasket: (id) => {
        setSaved((prev) => prev.filter((s) => s !== id));
        setLines((prev) =>
          prev.some((l) => l.id === id) ? prev : [...prev, { id, qty: 1 }]
        );
      },
      removeSaved: (id) => setSaved((prev) => prev.filter((s) => s !== id)),
      applyPromo: (code) => {
        const c = code.trim().toUpperCase();
        const def = PROMOS[c];
        if (!def) {
          setPromoError(`"${code.trim()}" isn't a valid promo code.`);
          return;
        }
        if (subtotal < def.minSubtotal) {
          setPromoError(`${c} needs a minimum spend of £${def.minSubtotal}.`);
          return;
        }
        setPromo(c);
        setPromoError(null);
      },
      clearPromo: () => {
        setPromo(null);
        setPromoError(null);
      },
      setDelivery,
    };
  }, [lines, saved, promo, delivery, hydrated, promoError]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export { FREE_DELIVERY_THRESHOLD };
