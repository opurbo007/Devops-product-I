import Link from "next/link";
import { productById, useCart } from "@/lib/cart";
import { gbp } from "@/lib/format";

export default function CheckoutSummary() {
  const { lines, subtotal, discount, deliveryFee, total, promo } = useCart();

  return (
    <aside aria-label="Order summary" className="rounded-sm border border-zinc-200 bg-white lg:sticky lg:top-4">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-[15px] font-bold text-zinc-950">Order summary</h2>
      </div>
      <ul className="divide-y divide-zinc-100 px-5">
        {lines.map((l) => {
          const p = productById(l.id);
          if (!p) return null;
          return (
            <li key={l.id} className="flex items-center gap-3 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-zinc-100 text-[13px] font-bold text-zinc-600">
                {l.qty}×
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-zinc-900">{p.name}</span>
                <span className="block text-[12px] text-zinc-500">{p.brand}</span>
              </span>
              <span className="shrink-0 text-[13.5px] font-bold tabular-nums">{gbp(p.price * l.qty)}</span>
            </li>
          );
        })}
      </ul>
      <dl className="space-y-1.5 border-t border-zinc-200 px-5 py-4 text-[13.5px]">
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
          <dt className="text-zinc-600">Delivery</dt>
          <dd className="font-semibold tabular-nums">{deliveryFee === 0 ? "Free" : gbp(deliveryFee)}</dd>
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-2.5 text-[17px]">
          <dt className="font-bold text-zinc-950">Total</dt>
          <dd className="font-bold tracking-tight tabular-nums">{gbp(total)}</dd>
        </div>
      </dl>
      <div className="px-5 pb-4">
        <Link href="/cart" className="text-[13px] font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600">
          ← Back to basket
        </Link>
      </div>
    </aside>
  );
}
