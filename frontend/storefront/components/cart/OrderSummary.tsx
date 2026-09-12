import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DELIVERY_OPTIONS, useCart } from "@/lib/cart";
import { gbp } from "@/lib/format";

export default function OrderSummary() {
  const {
    subtotal, discount, deliveryFee, total, promo, promoError,
    delivery, applyPromo, clearPromo, setDelivery,
  } = useCart();
  const [code, setCode] = useState("");

  const deliveryLabel =
    delivery === "nextday" ? "Next-day" : delivery === "collect" ? "Click & Collect" : "Standard";

  return (
    <aside aria-label="Order summary" className="rounded-sm border border-zinc-200 bg-white lg:sticky lg:top-4">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-[15px] font-bold text-zinc-950">Order summary</h2>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Promo code */}
        <div>
          {promo ? (
            <div className="flex items-center justify-between rounded-sm bg-zinc-950 px-3 py-2 text-[13px] font-semibold text-white">
              <span>{promo} applied · −{gbp(discount)}</span>
              <button onClick={clearPromo} aria-label="Remove promo code" className="text-[16px] leading-none text-zinc-300 hover:text-white">
                ×
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) applyPromo(code);
              }}
            >
              <label htmlFor="promo" className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                Promo code
              </label>
              <div className="flex gap-2">
                <input
                  id="promo"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. VOLT10"
                  autoComplete="off"
                  className="h-10 w-full rounded-sm border border-zinc-300 px-3 text-[13.5px] uppercase placeholder:normal-case placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
                />
                <Button type="submit" variant="outline" size="sm" className="h-10 shrink-0 px-4">
                  Apply
                </Button>
              </div>
              {promoError ? (
                <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-[#b3261e]">{promoError}</p>
              ) : (
                <p className="mt-1.5 text-[12px] text-zinc-500">Try VOLT10 for 10% off orders over £100.</p>
              )}
            </form>
          )}
        </div>

        {/* Delivery */}
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">
            Delivery
          </legend>
          <div className="space-y-1.5">
            {DELIVERY_OPTIONS.map((o) => (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-[13px] ${
                  delivery === o.id ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === o.id}
                  onChange={() => setDelivery(o.id)}
                  className="h-4 w-4 accent-zinc-950"
                />
                <span className="flex-1">
                  <span className="block font-semibold text-zinc-950">{o.label}</span>
                  <span className="block text-[12px] text-zinc-500">{o.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Totals */}
        <dl className="space-y-1.5 border-t border-zinc-200 pt-3 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd className="font-semibold tabular-nums">{gbp(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-800">
              <dt>Discount ({promo})</dt>
              <dd className="font-semibold tabular-nums">−{gbp(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-zinc-600">Delivery ({deliveryLabel})</dt>
            <dd className="font-semibold tabular-nums">{deliveryFee === 0 ? "Free" : gbp(deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2.5 text-[17px]">
            <dt className="font-bold text-zinc-950">Total <span className="text-[12px] font-normal text-zinc-500">inc. VAT</span></dt>
            <dd className="font-bold tracking-tight text-zinc-950 tabular-nums">{gbp(total)}</dd>
          </div>
        </dl>

        <a
          href="/checkout"
          className="flex h-12 w-full items-center justify-center rounded-sm bg-zinc-950 text-[15px] font-semibold text-white hover:bg-zinc-800"
        >
          Continue to checkout
        </a>
        <p className="text-center text-[12px] text-zinc-500">
          or {gbp(Math.round((total / 36) * 100) / 100)}/month · 0% APR available at checkout
        </p>

        <ul className="space-y-1.5 border-t border-zinc-200 pt-3 text-[12.5px] text-zinc-600">
          <li>✓ 30-day returns on everything</li>
          <li>✓ 2-year guarantee on new tech</li>
          <li>✓ Secure checkout · Visa, PayPal, Klarna</li>
        </ul>
      </div>
    </aside>
  );
}
