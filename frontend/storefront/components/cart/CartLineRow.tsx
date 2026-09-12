import Link from "next/link";
import type { Product } from "@/data/products";
import { CategoryGlyph } from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { gbp } from "@/lib/format";

function QtyStepper({ id, qty }: { id: string; qty: number }) {
  const { setQty } = useCart();
  return (
    <div className="flex h-9 items-center rounded-sm border border-zinc-300" aria-label="Quantity">
      <button
        onClick={() => setQty(id, qty - 1)}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
        className="flex h-full w-9 items-center justify-center text-[17px] text-zinc-700 disabled:opacity-30"
      >
        −
      </button>
      <span aria-live="polite" className="w-7 text-center text-[14px] font-bold tabular-nums">{qty}</span>
      <button
        onClick={() => setQty(id, qty + 1)}
        disabled={qty >= 5}
        aria-label="Increase quantity"
        className="flex h-full w-9 items-center justify-center text-[17px] text-zinc-700 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/**
 * Desktop: 4-column grid row (item / qty / total / actions).
 * Mobile: compact stacked card — thumb + details on top, qty + total row below.
 */
export default function CartLineRow({ product, qty }: { product: Product; qty: number }) {
  const { removeLine, saveForLater } = useCart();

  const thumb = (
    <Link
      href={`/products/${product.id}`}
      aria-label={product.name}
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-zinc-50 sm:h-24 sm:w-24"
    >
      <span className="[&>svg]:h-10 [&>svg]:w-10 sm:[&>svg]:h-12 sm:[&>svg]:w-12">
        <CategoryGlyph icon={product.icon} />
      </span>
    </Link>
  );

  const details = (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">{product.brand}</p>
      <Link href={`/products/${product.id}`} className="mt-0.5 block text-[14px] font-medium leading-snug text-zinc-950 hover:underline">
        {product.name}
      </Link>
      {(product.ramGB || product.storageGB || product.colour) && (
        <p className="mt-0.5 truncate text-[12px] text-zinc-500">
          {[product.ramGB ? `${product.ramGB}GB` : null,
            product.storageGB ? (product.storageGB >= 1000 ? `${product.storageGB / 1000}TB` : `${product.storageGB}GB`) : null,
            product.colour ?? null].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="mt-1 text-[12px] text-zinc-500">
        {gbp(product.price)} each
        {product.wasPrice && <span className="ml-1.5 line-through">{gbp(product.wasPrice)}</span>}
      </p>
      {/* Mobile actions */}
      <div className="mt-1.5 flex gap-4 sm:hidden">
        <button onClick={() => saveForLater(product.id)} className="text-[12.5px] font-semibold text-zinc-700 underline underline-offset-2">
          Save for later
        </button>
        <button onClick={() => removeLine(product.id)} className="text-[12.5px] font-semibold text-zinc-700 underline underline-offset-2">
          Remove
        </button>
      </div>
    </div>
  );

  return (
    <li className="bg-white px-4 py-4 sm:px-5">
      {/* Mobile layout */}
      <div className="flex gap-3 sm:hidden">
        {thumb}
        <div className="min-w-0 flex-1">{details}</div>
      </div>
      <div className="mt-3 flex items-center justify-between sm:hidden">
        <QtyStepper id={product.id} qty={qty} />
        <p className="text-[16px] font-bold tracking-tight text-zinc-950">{gbp(product.price * qty)}</p>
      </div>

      {/* Desktop layout */}
      <div className="hidden grid-cols-[1fr_auto_auto] items-center gap-6 sm:grid">
        <div className="flex min-w-0 gap-4">
          {thumb}
          <div className="min-w-0">{details}</div>
        </div>
        <QtyStepper id={product.id} qty={qty} />
        <div className="w-28 text-right">
          <p className="text-[16px] font-bold tracking-tight text-zinc-950">{gbp(product.price * qty)}</p>
          <div className="mt-1.5 flex justify-end gap-4">
            <button onClick={() => saveForLater(product.id)} className="text-[12.5px] font-medium text-zinc-500 hover:text-zinc-950 hover:underline">
              Save for later
            </button>
            <button onClick={() => removeLine(product.id)} aria-label={`Remove ${product.name}`} className="text-[12.5px] font-medium text-zinc-500 hover:text-[#b3261e] hover:underline">
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
