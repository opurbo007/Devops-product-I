"use client";

import { useState } from "react";
import type { Order } from "@/data/orders";
import RefundDialog from "./RefundDialog";

export default function OrderActions({ order }: { order: Order }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const refundable = order.payment === "Paid" || order.payment === "Authorised";

  return (
    <>
      <button
        onClick={() => window.print()}
        className="inline-flex h-9 items-center rounded-sm border border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-800 hover:border-zinc-950"
      >
        Packing slip
      </button>
      <button
        onClick={() => refundable && setRefundOpen(true)}
        disabled={!refundable}
        title={refundable ? "Issue a refund" : `Cannot refund — payment is ${order.payment.toLowerCase()}`}
        className="inline-flex h-9 items-center rounded-sm bg-zinc-950 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Issue refund
      </button>
      <RefundDialog order={order} open={refundOpen} onClose={() => setRefundOpen(false)} />
    </>
  );
}
