"use client";

import { useState } from "react";
import type { Order } from "@/data/orders";
import { Dialog } from "@/components/ui/dialog";

function gbp(v: number) {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RefundDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const [state, setState] = useState<"form" | "working" | "done">("form");
  const [reason, setReason] = useState("Customer request — 30-day returns");

  const confirm = () => {
    setState("working");
    setTimeout(() => setState("done"), 1200);
  };

  const close = () => {
    onClose();
    setTimeout(() => setState("form"), 200);
  };

  return (
    <Dialog open={open} onClose={close} title={state === "done" ? "Refund issued" : `Refund ${order.id}`}>
      {state === "form" && (
        <>
          <p>
            Refund <strong className="text-zinc-950">{gbp(order.total)}</strong> to {order.payMethod}?
            Funds typically arrive within 3–5 working days.
          </p>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[13px] font-semibold text-zinc-900">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 w-full rounded-sm border border-zinc-300 bg-white px-2.5 text-[13.5px] focus:border-zinc-950 focus:outline-none"
            >
              <option>Customer request — 30-day returns</option>
              <option>Faulty item — warranty claim</option>
              <option>Item damaged in transit</option>
              <option>Duplicate charge</option>
              <option>Goodwill gesture</option>
            </select>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={close} className="h-10 rounded-sm border border-zinc-300 px-4 text-[13.5px] font-semibold hover:border-zinc-950">
              Cancel
            </button>
            <button onClick={confirm} className="h-10 rounded-sm bg-[#b3261e] px-4 text-[13.5px] font-semibold text-white hover:bg-[#8f1d17]">
              Confirm refund
            </button>
          </div>
        </>
      )}
      {state === "working" && (
        <p className="flex items-center gap-2 py-2" aria-live="polite">
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950" />
          Contacting payment provider…
        </p>
      )}
      {state === "done" && (
        <>
          <p>
            <strong className="text-zinc-950">{gbp(order.total)}</strong> refunded for {order.id} ({reason.toLowerCase()}).
            The customer has been emailed automatically.
          </p>
          <div className="mt-4 flex justify-end">
            <button onClick={close} className="h-10 rounded-sm bg-zinc-950 px-4 text-[13.5px] font-semibold text-white">
              Done
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
