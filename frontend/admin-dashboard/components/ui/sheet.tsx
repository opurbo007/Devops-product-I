"use client";

import { useEffect, type ReactNode } from "react";

/** shadcn-style right-side sheet — overlay, scroll-lock, Escape to close. */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
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

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-zinc-950/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 flex w-[94vw] max-w-lg flex-col bg-white shadow-xl">
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
      <div>
        <h2 className="text-[16px] font-bold tracking-tight text-zinc-950">{title}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-zinc-500">{sub}</p>}
      </div>
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-zinc-200 text-[18px] leading-none text-zinc-700 hover:border-zinc-400"
      >
        ×
      </button>
    </div>
  );
}
