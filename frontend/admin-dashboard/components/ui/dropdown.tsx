"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type DropdownOption = { value: string; label: string; hint?: string };

/** shadcn-style dropdown — button + menu, dismiss on outside-click / Escape. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  allLabel,
  ariaLabel,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  allLabel: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  const selected = options.find((o) => o.value === value);
  const isAll = value === "";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        className={`flex h-10 items-center gap-2 rounded-sm border bg-white px-3 text-[13px] font-medium ${
          isAll ? "border-zinc-300 text-zinc-700 hover:border-zinc-500" : "border-zinc-950 text-zinc-950"
        }`}
      >
        <span className="text-zinc-500">{label}:</span>
        <span className="font-semibold">{isAll ? allLabel : selected?.label}</span>
        <span aria-hidden="true" className="text-[11px] text-zinc-400">▾</span>
      </button>
      {open && (
        <div role="listbox" aria-label={ariaLabel} className="absolute left-0 z-40 mt-1.5 min-w-52 rounded-sm border border-zinc-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <button
            role="option"
            aria-selected={isAll}
            onClick={() => { onChange(""); setOpen(false); }}
            className={`block w-full px-3.5 py-2 text-left text-[13px] hover:bg-zinc-50 ${isAll ? "font-bold text-zinc-950" : "text-zinc-700"}`}
          >
            {allLabel}
          </button>
          <div aria-hidden="true" className="my-1 h-px bg-zinc-100" />
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={value === o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-4 px-3.5 py-2 text-left text-[13px] hover:bg-zinc-50 ${value === o.value ? "font-bold text-zinc-950" : "text-zinc-700"}`}
            >
              <span>{o.label}</span>
              {o.hint && <span className="tabular-nums text-zinc-400">{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
