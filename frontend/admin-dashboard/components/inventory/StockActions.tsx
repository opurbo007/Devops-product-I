"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { StockEvent } from "@/lib/inventory";
import { ApiError, apiAdjustStock } from "@/lib/api";

export function AdjustStock({
  sku,
  onAdjusted,
}: {
  sku: string;
  onAdjusted: (qtyDelta: number, ev: StockEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"receive" | "correction" | "writeoff">("receive");
  const [qty, setQty] = useState("10");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const n = parseInt(qty, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a quantity of 1 or more.");
      return;
    }
    const delta = kind === "writeoff" ? -n : n;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiAdjustStock(sku, delta);
      void updated;
      onAdjusted(delta, {
        kind: kind === "receive" ? "Received" : "Adjusted",
        detail: `${kind === "receive" ? `Goods-in: ${n} units` : kind === "writeoff" ? `Write-off: ${n} units` : `Count correction: +${n} units`}${note.trim() ? ` — ${note.trim()}` : ""}`,
        by: "Ops console (you)",
        at: "just now",
      });
      setOpen(false);
      setQty("10");
      setNote("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Adjustment failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-sm bg-zinc-950 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-800"
      >
        Adjust stock
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Adjust stock — ${sku}`}>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-zinc-900">Adjustment type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="h-10 w-full rounded-sm border border-zinc-300 bg-white px-2.5 text-[13.5px] focus:border-zinc-950 focus:outline-none"
            >
              <option value="receive">Receive — goods-in delivery</option>
              <option value="correction">Count correction — found stock</option>
              <option value="writeoff">Write-off — damaged / lost</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-zinc-900">Quantity</span>
            <input
              value={qty}
              inputMode="numeric"
              onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-10 w-full rounded-sm border border-zinc-300 px-3 text-[13.5px] focus:border-zinc-950 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-zinc-900">
              Note <span className="font-normal text-zinc-500">(optional)</span>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. ASN-55821, damaged in transit"
              className="h-10 w-full rounded-sm border border-zinc-300 px-3 text-[13.5px] placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </label>
          {error && <p role="alert" className="text-[12.5px] font-medium text-[#b3261e]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="h-10 rounded-sm border border-zinc-300 px-4 text-[13.5px] font-semibold hover:border-zinc-950">
              Cancel
            </button>
            <button onClick={apply} disabled={busy} className="h-10 rounded-sm bg-zinc-950 px-4 text-[13.5px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60">
              {busy ? "Applying…" : "Apply adjustment"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function RaisePO({ sku, suggested }: { sku: string; suggested: number }) {
  const [raised, setRaised] = useState(false);
  if (raised) {
    return (
      <p className="rounded-sm bg-green-50 px-3.5 py-2.5 text-[13px] font-semibold text-green-800" aria-live="polite">
        ✓ PO-2841 raised for {suggested} units of {sku} — ETA 6 working days.
      </p>
    );
  }
  return (
    <div className="rounded-sm border border-amber-300 bg-amber-50 px-3.5 py-3">
      <p className="text-[13px] font-semibold text-zinc-950">Suggested reorder: {suggested} units</p>
      <p className="mt-0.5 text-[12.5px] text-zinc-600">Based on 14-day sell-through · {sku} · lead time 6 days.</p>
      <button
        onClick={() => setRaised(true)}
        className="mt-2.5 h-9 rounded-sm bg-zinc-950 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-800"
      >
        Raise purchase order
      </button>
    </div>
  );
}
