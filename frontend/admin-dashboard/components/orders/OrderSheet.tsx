"use client";

import { useState } from "react";
import type { Order } from "@/data/orders";
import { Sheet, SheetHeader } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { orderBadge, paymentBadge } from "./badges";

function gbp(v: number) {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FLOW = ["Placed", "Paid", "Picking", "Packed", "Shipped", "Delivered"] as const;

function flowIndex(o: Order): number {
  if (o.payment === "Failed") return 0;
  switch (o.status) {
    case "Awaiting payment": return 1;
    case "Picking": return 2;
    case "Packed": return 3;
    case "Shipped": return 4;
    case "Delivered": return 5;
    default: return 1;
  }
}

function RefundDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
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

export default function OrderSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const reached = order ? flowIndex(order) : 0;
  const terminal = order && (order.status === "Cancelled" || order.status === "Refunded");
  const refundable = order && (order.payment === "Paid" || order.payment === "Authorised");

  return (
    <Sheet open={order !== null} onClose={onClose} label={order ? `Order ${order.id}` : "Order details"}>
      {order && (
        <>
          <SheetHeader title={order.id} sub={`${order.created} · ${order.items.reduce((n, i) => n + i.qty, 0)} items`} onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={orderBadge(order.status)}>{order.status}</Badge>
              <Badge variant={paymentBadge(order.payment)}>{order.payment}</Badge>
            </div>

            {/* Items */}
            <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Items</h3>
            <ul className="divide-y divide-zinc-100 rounded-sm border border-zinc-200">
              {order.items.map((i) => (
                <li key={i.name} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-zinc-950">{i.name}</span>
                    <span className="text-zinc-500">Qty {i.qty}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{gbp(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex justify-between text-zinc-600"><dt>Subtotal</dt><dd className="tabular-nums">{gbp(order.total)}</dd></div>
              <div className="flex justify-between text-zinc-600"><dt>Delivery</dt><dd>{order.total >= 50 ? "Free" : "£3.99"}</dd></div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-[15px] font-bold"><dt>Total</dt><dd className="tabular-nums">{gbp(order.total)}</dd></div>
            </dl>

            {/* Customer + payment */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-zinc-200 p-3.5">
                <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Customer</h3>
                <p className="text-[13.5px] font-semibold text-zinc-950">{order.customer}</p>
                <p className="text-[12.5px] text-zinc-600">{order.email}</p>
                <p className="text-[12.5px] text-zinc-600">{order.town}</p>
              </div>
              <div className="rounded-sm border border-zinc-200 p-3.5">
                <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Payment</h3>
                <p className="text-[13.5px] font-semibold text-zinc-950">{order.payMethod}</p>
                <p className="text-[12.5px] text-zinc-600">Status: {order.payment}</p>
              </div>
            </div>

            {/* Timeline */}
            <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Fulfilment timeline</h3>
            {terminal ? (
              <p className="rounded-sm bg-zinc-100 px-3.5 py-2.5 text-[13px] font-medium text-zinc-700">
                Order {order.status.toLowerCase()} — no further fulfilment steps.
              </p>
            ) : (
              <ol className="space-y-0">
                {FLOW.map((s, i) => {
                  const done = i <= reached;
                  const failed = s === "Paid" && order.payment === "Failed";
                  return (
                    <li key={s} className="flex gap-3">
                      <span className="flex flex-col items-center">
                        <span aria-hidden="true" className={`mt-1 h-2.5 w-2.5 rounded-full ${failed ? "bg-[#b3261e]" : done ? "bg-green-700" : "bg-zinc-200"}`} />
                        {i < FLOW.length - 1 && <span aria-hidden="true" className={`w-px flex-1 ${i < reached ? "bg-green-700" : "bg-zinc-200"}`} />}
                      </span>
                      <span className={`pb-4 text-[13px] ${done && !failed ? "font-semibold text-zinc-950" : "text-zinc-500"}`}>
                        {s}{failed ? " — payment failed, retry needed" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="flex gap-2 border-t border-zinc-200 p-4">
            <button
              onClick={() => window.print()}
              className="h-10 flex-1 rounded-sm border border-zinc-300 text-[13.5px] font-semibold hover:border-zinc-950"
            >
              Packing slip
            </button>
            <button
              onClick={() => refundable && setRefundOpen(true)}
              disabled={!refundable}
              title={refundable ? "Issue a refund" : `Cannot refund — payment is ${order.payment.toLowerCase()}`}
              className="h-10 flex-1 rounded-sm bg-zinc-950 text-[13.5px] font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Issue refund
            </button>
          </div>
          <RefundDialog order={order} open={refundOpen} onClose={() => setRefundOpen(false)} />
        </>
      )}
    </Sheet>
  );
}
