"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import {
  ApiError,
  apiListPayments,
  apiRefundOrder,
  type Payment,
} from "@/lib/api";
import { useRequireAdmin } from "@/lib/auth";

function statusBadge(s: string) {
  if (s === "completed") return <Badge variant="success">Completed</Badge>;
  if (s === "failed") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="warning">Refunded</Badge>;
}

function PaymentsView() {
  useRequireAdmin();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiListPayments(status || undefined)
      .then((list) => {
        if (!cancelled) {
          setRows(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load payments.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const refund = async (orderId: string) => {
    if (!window.confirm(`Refund the completed payment for order ${orderId.slice(0, 8)}?`)) return;
    setRefunding(orderId);
    try {
      await apiRefundOrder(orderId);
      setRows((prev) =>
        prev?.map((p) => (p.orderId === orderId ? { ...p, status: "refunded" } : p)) ?? prev,
      );
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Refund failed.");
    } finally {
      setRefunding(null);
    }
  };

  return (
    <AdminShell
      crumbs={[{ label: "Sell" }, { label: "Payments" }]}
      title="Payments"
      actions={
        <span className="text-[13px] tabular-nums text-zinc-500" aria-live="polite">
          {rows === null ? "Loading…" : `${rows.length} payments`}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Dropdown
          label="Status"
          ariaLabel="Filter by payment status"
          allLabel="All payments"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setRows(null);
          }}
          options={[
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Failed" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <Table className="min-w-[900px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>Order</TableHeadCell>
              <TableHeadCell>Amount</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Provider reference</TableHeadCell>
              <TableHeadCell>Created</TableHeadCell>
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {error ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">Couldn&apos;t reach the API</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">{error}</p>
                </td>
              </tr>
            ) : rows === null ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-[13.5px] text-zinc-600">
                  Loading payments…
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/orders/${p.orderId}`} className="font-mono text-[12.5px] font-semibold text-zinc-950 hover:underline">
                      {p.orderId.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    £{(p.amountMinor / 100).toFixed(2)} {p.currency}
                  </TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-[12px] text-zinc-600" title={p.providerReference ?? ""}>
                    {p.providerReference ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-zinc-600">
                    {new Date(p.createdAt).toLocaleString("en-GB")}
                  </TableCell>
                  <TableCell>
                    {p.status === "completed" && (
                      <button
                        onClick={() => void refund(p.orderId)}
                        disabled={refunding === p.orderId}
                        className="rounded-sm border border-[#b3261e] px-2.5 py-1 text-[12.5px] font-semibold text-[#8f1d17] hover:bg-red-50 disabled:opacity-60"
                      >
                        {refunding === p.orderId ? "…" : "Refund"}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-[13.5px] text-zinc-600">
                  No payments found.
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsView />
    </Suspense>
  );
}
