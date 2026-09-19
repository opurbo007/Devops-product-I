"use client";

import { useState } from "react";
import type { Order } from "@/data/orders";
import RefundDialog from "./RefundDialog";
import { ApiError, apiCancelOrder } from "@/lib/api";

export default function OrderActions({
  order,
  onChanged,
}: {
  order: Order;
  onChanged?: () => void;
}) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const refundable = order.payment === "Paid" || order.payment === "Authorised";
  const cancellable = order.status === "Awaiting payment" && !!order.backendId;

  const cancel = async () => {
    if (!order.backendId || !cancellable || cancelling) return;
    if (!window.confirm(`Cancel order ${order.id}? Only pending orders can be cancelled.`)) return;
    setCancelling(true);
    setActionError(null);
    try {
      await apiCancelOrder(order.backendId);
      onChanged?.();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Cancel failed.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <button
        onClick={() => window.print()}
        className="inline-flex h-9 items-center rounded-sm border border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-800 hover:border-zinc-950"
      >
        Packing slip
      </button>
      {cancellable && (
        <button
          onClick={cancel}
          disabled={cancelling}
          className="inline-flex h-9 items-center rounded-sm border border-[#b3261e] bg-white px-3.5 text-[13px] font-semibold text-[#8f1d17] hover:bg-red-50 disabled:opacity-60"
        >
          {cancelling ? "Cancelling…" : "Cancel order"}
        </button>
      )}
      <button
        onClick={() => refundable && setRefundOpen(true)}
        disabled={!refundable}
        title={refundable ? "Issue a refund" : `Cannot refund — payment is ${order.payment.toLowerCase()}`}
        className="inline-flex h-9 items-center rounded-sm bg-zinc-950 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Issue refund
      </button>
      {actionError && (
        <span role="alert" className="text-[12.5px] font-medium text-[#8f1d17]">
          {actionError}
        </span>
      )}
      <RefundDialog
        order={order}
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onRefunded={onChanged}
      />
    </>
  );
}
