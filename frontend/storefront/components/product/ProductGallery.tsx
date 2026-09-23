"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { Badge } from "@/components/ui/badge";
import { gbp } from "@/lib/format";
import { productImageSrc } from "@/lib/productImage";

const VIEWS = ["Front", "Profile", "Keyboard", "Ports"] as const;

function ViewArt({ view }: { view: (typeof VIEWS)[number] }) {
  const stroke = "stroke-zinc-400";
  if (view === "Front") {
    return (
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" stroke="currentColor" strokeWidth="2" className={stroke} aria-hidden="true">
        <rect x="45" y="15" width="130" height="95" rx="3" />
        <rect x="55" y="25" width="110" height="70" rx="1" strokeWidth="1.2" className="stroke-zinc-300" />
        <path d="M20 125h180l-8 12H28z" strokeLinejoin="round" />
        <circle cx="110" cy="20" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (view === "Profile") {
    return (
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" stroke="currentColor" strokeWidth="2" className={stroke} aria-hidden="true">
        <path d="M70 30 45 120h130L150 30z" strokeLinejoin="round" />
        <path d="M40 120h140l-6 14H46z" strokeLinejoin="round" />
        <path d="M70 30 60 70" strokeWidth="1.2" className="stroke-zinc-300" />
      </svg>
    );
  }
  if (view === "Keyboard") {
    return (
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" stroke="currentColor" strokeWidth="1.4" className={stroke} aria-hidden="true">
        <rect x="30" y="20" width="160" height="120" rx="4" />
        <rect x="40" y="30" width="140" height="46" rx="1" className="stroke-zinc-300" />
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 10 }).map((_, c) => (
            <rect key={`${r}-${c}`} x={42 + c * 13.6} y={84 + r * 12} width="11" height="9" rx="1" className="stroke-zinc-300" />
          ))
        )}
      </svg>
    );
  }
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" stroke="currentColor" strokeWidth="1.6" className={stroke} aria-hidden="true">
      <rect x="20" y="60" width="180" height="40" rx="3" />
      <rect x="36" y="72" width="22" height="12" rx="6" className="stroke-zinc-300" />
      <rect x="66" y="72" width="14" height="12" rx="1" className="stroke-zinc-300" />
      <rect x="88" y="72" width="14" height="12" rx="1" className="stroke-zinc-300" />
      <circle cx="150" cy="78" r="5" className="stroke-zinc-300" />
      <rect x="165" y="72" width="20" height="12" rx="1" className="stroke-zinc-300" />
    </svg>
  );
}

export default function ProductGallery({ product }: { product: Product }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Front");
  const saving = (product.wasPrice ?? product.price) - product.price;
  const [imgBroken, setImgBroken] = useState(false);
  const src = imgBroken ? null : productImageSrc(product);

  return (
    <div>
      <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-sm border border-zinc-200 bg-zinc-50 sm:h-[420px]">
        {src ? (
          <Image
            src={src}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="text-center">
            <ViewArt view={view} />
            <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              {product.brand} · {view} view
            </p>
          </div>
        )}
        <div className="absolute left-4 top-4 flex gap-2">
          {product.badge === "Save" && saving > 0 && <Badge variant="sale">Save {gbp(saving)}</Badge>}
          {product.badge === "New" && <Badge>New</Badge>}
          {product.badge === "Clearance" && <Badge variant="default">Clearance</Badge>}
          {product.condition !== "New" && (
            <Badge variant="outline" className="bg-white">
              {product.condition}{product.grade ? ` · ${product.grade}` : ""}
            </Badge>
          )}
        </div>
      </div>
      {!src && (
        <div className="mt-3 grid grid-cols-4 gap-3" role="tablist" aria-label="Product views">
          {VIEWS.map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex h-20 flex-col items-center justify-center gap-1 rounded-sm border bg-white text-[11.5px] font-semibold ${
                view === v ? "border-zinc-950 text-zinc-950" : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
              }`}
            >
              <span aria-hidden="true" className="text-[15px] leading-none">
                {v === "Front" ? "▢" : v === "Profile" ? "▷" : v === "Keyboard" ? "▦" : "⇄"}
              </span>
              {v}
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
        {src
          ? "Photo of the listed product."
          : "Images are illustrative of the model range. Your exact colour and specification are listed below."}
      </p>
    </div>
  );
}
