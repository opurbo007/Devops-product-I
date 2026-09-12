"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartLineRow from "@/components/cart/CartLineRow";
import OrderSummary from "@/components/cart/OrderSummary";
import EmptyCart from "@/components/cart/EmptyCart";
import { FREE_DELIVERY_THRESHOLD, productById, useCart } from "@/lib/cart";
import { gbp } from "@/lib/format";

function FreeDeliveryBar({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const pct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  return (
    <div className="rounded-sm border border-zinc-200 bg-white px-4 py-3 sm:px-5" aria-live="polite">
      {remaining > 0 ? (
        <p className="text-[13px] text-zinc-700">
          Add <strong className="text-zinc-950">{gbp(remaining)}</strong> more to unlock <strong className="text-zinc-950">free standard delivery</strong>
        </p>
      ) : (
        <p className="text-[13px] font-semibold text-green-800">✓ You&apos;ve unlocked free standard delivery</p>
      )}
      <div className="mt-2 h-1.5 rounded-full bg-zinc-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
        <div className={`h-full rounded-full ${remaining > 0 ? "bg-zinc-950" : "bg-green-700"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SaveForLater() {
  const { saved, moveToBasket, removeSaved } = useCart();
  if (saved.length === 0) return null;
  return (
    <section aria-label="Saved for later" className="mt-8">
      <h2 className="mb-3 text-[16px] font-bold tracking-tight text-zinc-950">
        Saved for later ({saved.length})
      </h2>
      <ul className="divide-y divide-zinc-100 rounded-sm border border-zinc-200 bg-white">
        {saved.map((id) => {
          const p = productById(id);
          if (!p) return null;
          return (
            <li key={id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-zinc-900">
                  <span className="mr-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">{p.brand}</span>
                  <Link href={`/products/${p.id}`} className="hover:underline">{p.name}</Link>
                </p>
                <p className="mt-0.5 text-[13px] font-bold text-zinc-950">{gbp(p.price)}</p>
              </div>
              <button
                onClick={() => moveToBasket(id)}
                className="h-9 shrink-0 rounded-sm border border-zinc-950 px-3.5 text-[13px] font-semibold hover:bg-zinc-950 hover:text-white"
              >
                Move to basket
              </button>
              <button
                onClick={() => removeSaved(id)}
                aria-label={`Remove ${p.name} from saved items`}
                className="shrink-0 text-[13px] font-medium text-zinc-500 hover:text-[#b3261e] hover:underline"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CartContent() {
  const { lines, itemCount, subtotal, total } = useCart();

  if (lines.length === 0) return <EmptyCart />;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight text-zinc-950 sm:text-[30px]">
          Your basket
        </h1>
        <p className="mt-1 text-[13.5px] text-zinc-600">
          {itemCount} {itemCount === 1 ? "item" : "items"} · Prices include VAT
        </p>
      </div>

      <div className="mb-4">
        <FreeDeliveryBar subtotal={subtotal} />
      </div>

      {/* Desktop: side-by-side. Mobile: items first, summary after, sticky checkout bar. */}
      <div className="grid items-start gap-5 pb-24 lg:grid-cols-[1fr_360px] lg:pb-0">
        <div>
          <ul className="divide-y divide-zinc-200 rounded-sm border border-zinc-200">
            {lines.map((l) => {
              const p = productById(l.id);
              if (!p) return null;
              return <CartLineRow key={l.id} product={p} qty={l.qty} />;
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <Link href="/products" className="font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
              ← Continue shopping
            </Link>
            <p className="text-zinc-500">Order before 8pm for next-day delivery</p>
          </div>
          <SaveForLater />
        </div>
        <OrderSummary />
      </div>

      {/* Mobile sticky checkout bar — intentionally mobile-only */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-[14px]">
          <span className="text-zinc-600">Total <span className="text-[11.5px]">inc. VAT &amp; delivery</span></span>
          <span className="text-[19px] font-bold tracking-tight text-zinc-950">{gbp(total)}</span>
        </div>
        <a
          href="/checkout"
          className="flex h-12 w-full items-center justify-center rounded-sm bg-zinc-950 text-[15px] font-semibold text-white"
        >
          Continue to checkout
        </a>
      </div>
    </>
  );
}

export default function CartPage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-zinc-500">
            <ol className="flex items-center gap-1.5">
              <li><Link href="/" className="hover:text-zinc-950 hover:underline">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-semibold text-zinc-900">Basket</li>
            </ol>
          </nav>
          <CartContent />
        </div>
      </main>
      <Footer />
    </div>
  );
}
