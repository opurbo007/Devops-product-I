import { gbp } from "@/lib/format";
import type { Product } from "@/data/products";

function CategoryGlyph({ icon }: { icon: Product["icon"] }) {
  const common = "stroke-zinc-400";
  switch (icon) {
    case "tv":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <rect x="3" y="5" width="18" height="12" rx="1" /><path d="M9 21h6M12 17v4" strokeLinecap="round" />
        </svg>
      );
    case "laptop":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <rect x="5" y="4" width="14" height="10" rx="1" /><path d="M2 18h20l-1.5 2h-17z" strokeLinejoin="round" />
        </svg>
      );
    case "audio":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" strokeLinecap="round" /><rect x="3" y="13" width="4" height="7" rx="1" /><rect x="17" y="13" width="4" height="7" rx="1" />
        </svg>
      );
    case "phone":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" strokeLinecap="round" />
        </svg>
      );
    case "appliance":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="1" /><path d="M5 8h14M9 12h6" strokeLinecap="round" /><circle cx="12" cy="17" r="1" />
        </svg>
      );
    case "watch":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <rect x="8" y="6" width="8" height="12" rx="2" /><path d="M10 3h4M10 21h4M9 10h6M9 14h6" strokeLinecap="round" />
        </svg>
      );
    case "camera":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M9 7l1.5-2.5h3L15 7" strokeLinejoin="round" />
        </svg>
      );
    case "console":
      return (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" className={common} stroke="currentColor" aria-hidden="true">
          <path d="M7 8h10a5 5 0 0 1 5 5c0 2.5-2 4-4 4-1.2 0-2.3-.7-3-1.7L13.5 13h-3L9 15.3c-.7 1-1.8 1.7-3 1.7-2 0-4-1.5-4-4a5 5 0 0 1 5-5z" strokeLinejoin="round" /><path d="M8 12h.01M12 12h.01M15.5 11.5h.01M16.5 13.5h.01" strokeLinecap="round" />
        </svg>
      );
  }
}

function badgeStyle(badge: NonNullable<Product["badge"]>): string {
  switch (badge) {
    case "Save":
      return "bg-[#b3261e] text-white";
    case "Clearance":
      return "bg-zinc-950 text-white";
    case "New":
      return "bg-zinc-950 text-white";
    case "Bundle":
      return "bg-white text-zinc-950 border border-zinc-300";
  }
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`Rated ${rating} out of 5`} className="flex items-center gap-0.5 text-[14px] leading-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true" className={i < Math.round(rating) ? "text-zinc-950" : "text-zinc-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const saving = product.wasPrice ? product.wasPrice - product.price : 0;

  return (
    <article className="group flex flex-col rounded-sm border border-zinc-200 bg-white">
      <div className="relative flex h-44 items-center justify-center border-b border-zinc-100 bg-zinc-50">
        <CategoryGlyph icon={product.icon} />
        {product.badge && (
          <span className={`absolute left-3 top-3 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${badgeStyle(product.badge)}`}>
            {product.badge === "Save" && saving > 0 ? `Save ${gbp(saving)}` : product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
                <div className="flex items-center gap-2">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-zinc-500">{product.brand}</p>
          {product.condition && product.condition !== "New" && (
            <span className="border border-zinc-300 px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide text-zinc-600">
              {product.condition}{product.grade ? ` · ${product.grade}` : ""}
            </span>
          )}
        </div>        <h3 className="text-[14.5px] font-medium leading-snug text-zinc-900 group-hover:underline">
          <a href="#">{product.name}</a>
        </h3>
        {(product.ramGB || product.storageGB || product.colour) && (
          <p className="text-[12.5px] text-zinc-500">
            {[product.ramGB ? `${product.ramGB}GB RAM` : null,
              product.storageGB
                ? product.storageGB >= 1000
                  ? `${product.storageGB / 1000}TB SSD`
                  : `${product.storageGB}GB SSD`
                : null,
              product.colour ?? null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-[12.5px] text-zinc-500">({product.reviews.toLocaleString("en-GB")})</span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[19px] font-bold tracking-tight text-zinc-950">{gbp(product.price)}</span>
          {product.wasPrice && (
            <span className="text-[13px] text-zinc-500 line-through">{gbp(product.wasPrice)}</span>
          )}
        </div>
        {product.financeFrom && (
          <p className="text-[12.5px] text-zinc-500">or {gbp(product.financeFrom)}/mo · 0% APR</p>
        )}

        <p className="mt-auto flex items-center gap-1.5 pt-2 text-[12.5px] font-medium text-zinc-700">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${product.stock === "In stock" ? "bg-green-700" : product.stock === "Low stock" ? "bg-amber-600" : "bg-zinc-400"}`}
          />
          {product.stock === "Order in" ? "Available to order" : product.stock}
          {product.stock === "Low stock" ? " — order soon" : ""}
        </p>

        <button
          type="button"
          className="mt-2 h-10 w-full rounded-sm border border-zinc-950 text-[14px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white"
        >
          Add to basket
        </button>
      </div>
    </article>
  );
}
