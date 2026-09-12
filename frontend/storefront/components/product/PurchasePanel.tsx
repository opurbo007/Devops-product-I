"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/separator";
import { deliveryFor, variantLabel } from "@/lib/productDetails";
import { useCart } from "@/lib/cart";
import { gbp } from "@/lib/format";

export default function PurchasePanel({
  product,
  variants,
}: {
  product: Product;
  variants: Product[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const maxQty = product.stock === "Low stock" ? 3 : 5;
  const delivery = deliveryFor(product);

  const addToBasket = () => {
    addItem(product.id, qty);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div>
      {/* Variants */}
      {variants.length > 1 && (
        <div className="mb-5">
          <FieldLabel>
            Configuration: {variantLabel(product)}
          </FieldLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose configuration">
            {variants.map((v) => {
              const selected = v.id === product.id;
              return (
                <button
                  key={v.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    if (!selected) router.push(`/products/${v.id}`);
                  }}
                  className={`rounded-sm border px-3.5 py-2 text-left ${
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-950"
                  }`}
                >
                  <span className="block text-[13px] font-semibold">{variantLabel(v)}</span>
                  <span className={`block text-[12.5px] ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
                    {gbp(v.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity + wishlist */}
      <div className="mb-4 flex items-end gap-3">
        <div>
          <FieldLabel>Quantity</FieldLabel>
          <div className="flex h-11 items-center rounded-sm border border-zinc-300">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="flex h-full w-10 items-center justify-center text-[18px] text-zinc-700 disabled:opacity-30"
            >
              −
            </button>
            <span aria-live="polite" className="w-8 text-center text-[14.5px] font-bold tabular-nums">
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              aria-label="Increase quantity"
              className="flex h-full w-10 items-center justify-center text-[18px] text-zinc-700 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
        <button
          onClick={() => setWishlisted((w) => !w)}
          aria-pressed={wishlisted}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-sm border px-4 text-[13.5px] font-semibold sm:flex-none sm:px-6 ${
            wishlisted ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "border-zinc-300 text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
          }`}
        >
          <span aria-hidden="true" className="text-[17px] leading-none">{wishlisted ? "♥" : "♡"}</span>
          {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
        </button>
      </div>
      {product.stock === "Low stock" && (
        <p className="mb-3 text-[12.5px] font-medium text-amber-700">Only 3 left at this price — order soon.</p>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2.5">
        <Button size="lg" className="w-full" onClick={addToBasket}>
          {added ? "✓ Added to basket" : `Add to basket · ${gbp(product.price * qty)}`}
        </Button>
        <a
          href="/checkout"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#b3261e] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#8f1d17]"
        >
          Buy now
        </a>
      </div>
      {product.financeFrom && (
        <p className="mt-3 text-center text-[13px] text-zinc-600">
          or <strong className="text-zinc-950">{gbp(product.financeFrom)}/month</strong> · 0% APR over 36 months ·{" "}
          <a href="#" className="underline underline-offset-2">Check eligibility</a>
        </p>
      )}

      {/* Delivery */}
      <div className="mt-6 rounded-sm border border-zinc-200">
        <p className="border-b border-zinc-200 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">
          Delivery options
        </p>
        <ul className="divide-y divide-zinc-100">
          {delivery.map((d) => (
            <li key={d.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
              <span>
                <span className="block font-semibold text-zinc-950">{d.label}</span>
                <span className="block text-zinc-500">{d.detail}</span>
              </span>
              <span className="font-bold text-zinc-950">{d.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
