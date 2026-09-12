"use client";

import { useEffect, type ReactNode } from "react";

/** shadcn-style centred dialog — overlay, Escape to close, focus-safe close button. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-zinc-950/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-sm border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 className="text-[15px] font-bold text-zinc-950">{title}</h2>
        <div className="mt-2 text-[13.5px] leading-relaxed text-zinc-700">{children}</div>
      </div>
    </div>
  );
}
