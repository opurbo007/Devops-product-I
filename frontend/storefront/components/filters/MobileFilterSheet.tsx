"use client";

import { useEffect } from "react";
import type { FiltersState } from "@/lib/catalog";
import { countActive } from "@/lib/catalog";
import FilterControls from "./FilterControls";

export default function MobileFilterSheet({
  open,
  filters,
  resultCount,
  onChange,
  onClose,
  onClear,
}: {
  open: boolean;
  filters: FiltersState;
  resultCount: number;
  onChange: (next: FiltersState) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const active = countActive(filters);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Product filters">
      <div className="absolute inset-0 bg-zinc-950/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-[15px] font-bold text-zinc-950">
            Filters {active > 0 && <span className="text-zinc-500">({active})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-[18px] leading-none text-zinc-700"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <FilterControls filters={filters} onChange={onChange} />
        </div>
        <div className="flex gap-2 border-t border-zinc-200 p-3">
          <button
            type="button"
            onClick={onClear}
            className="h-11 flex-1 rounded-sm border border-zinc-300 text-[14px] font-semibold text-zinc-800"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-[2] rounded-sm bg-zinc-950 text-[14px] font-semibold text-white"
          >
            Show {resultCount} {resultCount === 1 ? "result" : "results"}
          </button>
        </div>
      </div>
    </div>
  );
}
