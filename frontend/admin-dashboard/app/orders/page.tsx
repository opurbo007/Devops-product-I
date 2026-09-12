"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import OrderSheet from "@/components/orders/OrderSheet";
import { orderBadge, paymentBadge } from "@/components/orders/badges";
import {
  ORDERS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  DATE_RANGES,
  type DateRange,
  type Order,
} from "@/data/orders";

const PAGE_SIZE = 10;

function gbp(v: number) {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-100 last:border-0" aria-hidden="true">
          <td className="px-4 py-3 first:pl-5"><div className="h-4 w-20 animate-pulse rounded-sm bg-zinc-100" /></td>
          <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded-sm bg-zinc-100" /></td>
          <td className="px-4 py-3"><div className="h-4 w-10 animate-pulse rounded-sm bg-zinc-100" /></td>
          <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded-sm bg-zinc-100" /></td>
          <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded-sm bg-zinc-100" /></td>
          <td className="px-4 py-3"><div className="h-5 w-24 animate-pulse rounded-sm bg-zinc-100" /></td>
          <td className="px-4 py-3 last:pr-5"><div className="h-4 w-24 animate-pulse rounded-sm bg-zinc-100" /></td>
        </tr>
      ))}
    </>
  );
}

export default function OrdersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [date, setDate] = useState<DateRange>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    if (query === debounced) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query, debounced]);

  const resetPage = () => setPage(1);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const range = DATE_RANGES.find((r) => r.value === date);
    return ORDERS.filter((o) => {
      if (q && ![o.id, o.customer, o.email, o.town].some((f) => f.toLowerCase().includes(q))) return false;
      if (status && o.status !== status) return false;
      if (payment && o.payment !== payment) return false;
      if (range && !range.test(o.ageH)) return false;
      return true;
    });
  }, [debounced, status, payment, date]);

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of ORDERS) m.set(o.status, (m.get(o.status) ?? 0) + 1);
    return m;
  }, []);

  const paymentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of ORDERS) m.set(o.payment, (m.get(o.payment) ?? 0) + 1);
    return m;
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = (status ? 1 : 0) + (payment ? 1 : 0) + (date ? 1 : 0) + (debounced.trim() ? 1 : 0);

  const clearAll = () => {
    setQuery("");
    setDebounced("");
    setStatus("");
    setPayment("");
    setDate("");
    resetPage();
  };

  return (
    <AdminShell
      crumbs={[{ label: "Sell" }, { label: "Orders" }]}
      title="Orders"
      actions={
        <span className="text-[13px] tabular-nums text-zinc-500" aria-live="polite">
          {filtered.length} of {ORDERS.length} orders
        </span>
      }
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-2.5 rounded-sm border border-zinc-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-center">
        <label className="relative block lg:w-80">
          <span className="sr-only">Search orders</span>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-zinc-400">⌕</span>
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            placeholder="Search ID, customer, email, town…"
            className="pl-9"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Dropdown
            label="Status"
            ariaLabel="Filter by order status"
            allLabel="All statuses"
            value={status}
            onChange={(v) => { setStatus(v); resetPage(); }}
            options={ORDER_STATUSES.map((s) => ({ value: s, label: s, hint: String(statusCounts.get(s) ?? 0) }))}
          />
          <Dropdown
            label="Payment"
            ariaLabel="Filter by payment status"
            allLabel="All payments"
            value={payment}
            onChange={(v) => { setPayment(v); resetPage(); }}
            options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s, hint: String(paymentCounts.get(s) ?? 0) }))}
          />
          <Dropdown
            label="Date"
            ariaLabel="Filter by date"
            allLabel="Any time"
            value={date}
            onChange={(v) => { setDate(v as DateRange); resetPage(); }}
            options={DATE_RANGES.map((r) => ({ value: r.value, label: r.label }))}
          />
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex h-10 items-center rounded-sm px-3 text-[13px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
            >
              Clear all ({activeCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <Table className="min-w-[900px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>Order</TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Items</TableHeadCell>
              <TableHeadCell>Total</TableHeadCell>
              <TableHeadCell>Payment</TableHeadCell>
              <TableHeadCell>Order status</TableHeadCell>
              <TableHeadCell>Created</TableHeadCell>
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {searching ? (
              <SkeletonRows />
            ) : visible.length > 0 ? (
              visible.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
                  <TableCell className="whitespace-nowrap font-mono text-[12.5px] font-semibold text-zinc-950">{o.id}</TableCell>
                  <TableCell>
                    <span className="block font-medium text-zinc-900">{o.customer}</span>
                    <span className="block text-[12px] text-zinc-500">{o.town}</span>
                  </TableCell>
                  <TableCell className="tabular-nums text-zinc-700" title={o.items.map((i) => `${i.qty}× ${i.name}`).join("; ")}>
                    {o.items.reduce((n, i) => n + i.qty, 0)}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{gbp(o.total)}</TableCell>
                  <TableCell><Badge variant={paymentBadge(o.payment)}>{o.payment}</Badge></TableCell>
                  <TableCell><Badge variant={orderBadge(o.status)}>{o.status}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-zinc-600">{o.created}</TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(o); }}
                      className="rounded-sm border border-zinc-300 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-800 hover:border-zinc-950 hover:text-zinc-950"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">No orders match these filters</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">
                    Try a different search term, widen the date range, or clear the filters to see all {ORDERS.length} orders.
                  </p>
                  <button
                    onClick={clearAll}
                    className="mt-4 h-10 rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white hover:bg-zinc-800"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 sm:px-5">
            <p className="text-[12.5px] tabular-nums text-zinc-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <nav className="flex items-center gap-1.5" aria-label="Pagination">
              <button
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
                className="flex h-9 min-w-9 items-center justify-center rounded-sm border border-zinc-300 px-2 text-[13px] font-semibold disabled:opacity-40 enabled:hover:border-zinc-950"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === safePage ? "page" : undefined}
                  className={`h-9 min-w-9 rounded-sm border px-2 text-[13px] font-semibold ${
                    p === safePage ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 hover:border-zinc-950"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={safePage === totalPages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
                className="flex h-9 min-w-9 items-center justify-center rounded-sm border border-zinc-300 px-2 text-[13px] font-semibold disabled:opacity-40 enabled:hover:border-zinc-950"
              >
                →
              </button>
            </nav>
          </div>
        )}
      </div>

      <OrderSheet order={selected} onClose={() => setSelected(null)} />
    </AdminShell>
  );
}
