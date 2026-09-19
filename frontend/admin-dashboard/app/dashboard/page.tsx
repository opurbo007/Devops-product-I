"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { HOURLY_VOLUME, EVENT_TYPES, SYSTEM_EVENTS } from "@/data/dashboard";
import {
  ApiError,
  apiListNotifications,
  apiListOrders,
  apiListPayments,
  apiListStock,
  apiPeekDlq,
  fetchServiceHealth,
  type DlqService,
} from "@/lib/api";
import { notificationToEvent, toAdminOrder, toSku } from "@/lib/backend";
import { useAuth, useRequireAdmin } from "@/lib/auth";
import type { Order } from "@/data/orders";

function orderPill(s: string) {
  if (s === "Delivered") return "bg-green-100 text-green-900";
  if (s === "Packed" || s === "Picking" || s === "Shipped") return "bg-amber-100 text-amber-900";
  if (s === "Refunded") return "bg-zinc-200 text-zinc-700";
  return "bg-zinc-100 text-zinc-700";
}

const DLQ_SERVICES: DlqService[] = [
  "orders",
  "inventory",
  "shipping",
  "payments",
  "notifications",
];

type Kpi = { label: string; value: string; delta: string; up: boolean | null; note: string };

export default function DashboardPage() {
  const { user } = useAuth();
  useRequireAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [failedList, setFailedList] = useState<{ order: string; backendId: string; amount: string; reason: string; time: string }[]>([]);
  const [warnings, setWarnings] = useState<{ sku: string; product: string; severity: string; onHand: number }[]>([]);
  const [feed, setFeed] = useState<{ type: string; ref: string; time: string; state: string }[]>([]);
  const [dlqOpen, setDlqOpen] = useState(0);
  const [servicesUp, setServicesUp] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orderRows, payments, stock, notes, dlq, health] = await Promise.all([
          apiListOrders(),
          apiListPayments().catch(() => []),
          apiListStock().catch(() => []),
          apiListNotifications(undefined, 8).catch(() => []),
          Promise.allSettled(DLQ_SERVICES.map((s) => apiPeekDlq(s, 50))).catch(() => []),
          Promise.allSettled(
            (["orders", "inventory", "shipping", "payments", "notifications", "cart"] as const).map((s) =>
              fetchServiceHealth(s),
            ),
          ).catch(() => []),
        ]);
        if (cancelled) return;
        const payByOrder = new Map(payments.map((p) => [p.orderId, p]));
        const adapted = orderRows.map((o) => toAdminOrder(o, payByOrder.get(o.id)));
        setOrders(adapted);

        const failed = payments.filter((p) => p.status === "failed").slice(0, 5);
        setFailedCount(payments.filter((p) => p.status === "failed").length);
        setFailedList(
          failed.map((p) => ({
            order: p.orderId.slice(0, 8).toUpperCase(),
            backendId: p.orderId,
            amount: `£${(p.amountMinor / 100).toFixed(2)}`,
            reason: `Charge failed · ${p.currency}`,
            time: new Date(p.createdAt).toLocaleString("en-GB"),
          })),
        );

        setWarnings(
          stock
            .map(toSku)
            .filter((s) => s.available <= s.reorderPoint)
            .slice(0, 5)
            .map((s) => ({
              sku: s.sku,
              product: s.product,
              severity: s.available <= 0 ? "Out of stock" : "Low",
              onHand: s.available,
            })),
        );

        setFeed(
          notes.map((n) => {
            const e = notificationToEvent(n);
            return {
              type: e.type,
              ref: e.order ?? e.correlationId.slice(0, 8),
              time: new Date(e.epoch).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
              state: "Delivered",
            };
          }),
        );

        setDlqOpen(
          dlq
            .filter((r) => r.status === "fulfilled")
            .reduce((n, r) => n + (r as PromiseFulfilledResult<unknown[]>).value.length, 0),
        );

        const up = health.filter(
          (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<{ ok: boolean }>).value.ok,
        ).length;
        setServicesUp(`${up}/6`);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Dashboard data unavailable.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dist = new Map<string, number>();
  for (const o of orders) dist.set(o.status, (dist.get(o.status) ?? 0) + 1);
  const distTotal = orders.length || 1;
  const maxHour = Math.max(...HOURLY_VOLUME);

  const kpis: Kpi[] = [
    { label: "Orders", value: loaded ? String(orders.length) : "…", delta: "", up: null, note: "in scope" },
    { label: "Failed payments", value: loaded ? String(failedCount) : "…", delta: "", up: failedCount > 0 ? false : null, note: "need attention" },
    { label: "Open DLQ entries", value: loaded ? String(dlqOpen) : "…", delta: "", up: dlqOpen > 0 ? false : null, note: "across 5 services" },
    { label: "Stock warnings", value: loaded ? String(warnings.length) : "…", delta: "", up: null, note: "low / out" },
    { label: "Services up", value: servicesUp ?? "…", delta: "", up: null, note: "fleet health" },
    { label: "Notifications sent", value: loaded ? String(feed.length) : "…", delta: "", up: null, note: "latest activity" },
  ];

  const recent = [...orders]
    .sort((a, b) => b.ageH - a.ageH)
    .slice(0, 8);

  return (
    <AdminShell
      crumbs={[{ label: "Overview" }, { label: "Dashboard" }]}
      title={`Good afternoon${user ? `, ${user.email.split("@")[0]}` : ""}`}
      actions={
        <>
          <Link
            href="/orders"
            className="hidden h-9 items-center rounded-sm border border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-800 hover:border-zinc-950 sm:inline-flex"
          >
            Export report
          </Link>
          <Link
            href="/orders"
            className="inline-flex h-9 items-center rounded-sm bg-zinc-950 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-800"
          >
            New order
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <p role="alert" className="rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3 text-[14px] text-[#8f1d17]">
            {error}
          </p>
        )}
        {/* KPI strip */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((s, i) => (
            <div
              key={s.label}
              className={`border-zinc-200 px-4 py-3.5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-md:border-t" : ""} ${i % 3 !== 0 ? "md:border-l" : ""} ${i >= 3 ? "md:border-t xl:border-t-0" : ""} ${i > 0 ? "xl:border-l" : ""}`}
            >
              <dt className="text-[12px] font-medium text-zinc-500">{s.label}</dt>
              <dd className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-zinc-950">{s.value}</dd>
              <dd className={`mt-0.5 text-[12px] ${s.up === null ? "text-zinc-500" : s.up ? "font-semibold text-green-800" : "font-semibold text-[#b3261e]"}`}>
                {s.delta} <span className="font-normal text-zinc-500">{s.note}</span>
              </dd>
            </div>
          ))}
        </dl>

        {/* Orders + distribution */}
        <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
              <h2 className="text-[13.5px] font-bold text-zinc-950">Recent orders</h2>
              <Link href="/orders" className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-950 hover:underline">
                View all orders →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Order</th>
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-4 py-2.5 font-semibold">Total</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recent.map((o) => (
                    <tr key={o.backendId ?? o.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 font-mono text-[12.5px] font-semibold text-zinc-950 sm:px-5">
                        <Link href={`/orders/${o.backendId ?? o.id}`} className="hover:underline">{o.id}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-800">{o.customer}</td>
                      <td className="px-4 py-2.5 font-semibold tabular-nums">£{o.total.toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 text-[11.5px] font-semibold ${orderPill(o.status)}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 sm:px-5">{o.created}</td>
                    </tr>
                  ))}
                  {loaded && recent.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-zinc-500">
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Status distribution */}
          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-2.5 sm:px-5">
              <h2 className="text-[13.5px] font-bold text-zinc-950">Orders by status</h2>
            </div>
            <ul className="space-y-2.5 p-4 sm:p-5" aria-label="Order status distribution">
              {[...dist.entries()].map(([status, count]) => {
                const pct = Math.round((count / distTotal) * 100);
                return (
                  <li key={status}>
                    <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                      <span className="font-medium text-zinc-700">{status}</span>
                      <span className="tabular-nums text-zinc-500">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100" role="img" aria-label={`${status}: ${count} orders, ${pct} percent`}>
                      <div className="h-full rounded-full bg-zinc-950" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
              {dist.size === 0 && (
                <li className="text-[13px] text-zinc-500">{loaded ? "No orders yet." : "Loading…"}</li>
              )}
            </ul>
          </section>
        </div>

        {/* Event activity */}
        <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
            <h2 className="text-[13.5px] font-bold text-zinc-950">Event activity — last 24 hours</h2>
            <Link href="/events" className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-950 hover:underline">
              Event stream →
            </Link>
          </div>
          <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="flex h-24 items-end gap-[3px]" role="img" aria-label="Events published per hour">
                {HOURLY_VOLUME.map((v, i) => (
                  <div
                    key={i}
                    title={`${String(i).padStart(2, "0")}:00 — ${v} events`}
                    className={`flex-1 rounded-t-[2px] ${v < 25 ? "bg-[#b3261e]" : "bg-zinc-950"}`}
                    style={{ height: `${Math.max(6, Math.round((v / maxHour) * 100))}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[11px] tabular-nums text-zinc-400">
                <span>12:00 Tue</span><span>00:00</span><span>12:00 today</span>
              </div>
              <ul className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100">
                {EVENT_TYPES.map((e) => (
                  <li key={e.type} className="flex items-center gap-3 py-2 text-[12.5px]">
                    <code className="min-w-0 flex-1 truncate font-mono text-zinc-950">{e.type}</code>
                    <span className="tabular-nums text-zinc-500">{e.lastHour}/h</span>
                    <span className="tabular-nums text-zinc-500">err {e.errorRate}</span>
                    <span className="tabular-nums text-zinc-500">lag {e.lag}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500">Latest events</p>
              <ul className="divide-y divide-zinc-100 border-y border-zinc-100">
                {feed.map((e) => (
                  <li key={e.type + e.time + e.ref} className="flex items-center gap-3 py-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-700" />
                    <span className="min-w-0 flex-1">
                      <code className="block truncate font-mono text-[12.5px] font-semibold text-zinc-950">{e.type}</code>
                      <span className="block truncate text-[12px] text-zinc-500">{e.ref} · {e.time}</span>
                    </span>
                    <span className="shrink-0 bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-900">{e.state}</span>
                  </li>
                ))}
                {feed.length === 0 && (
                  <li className="py-3 text-[13px] text-zinc-500">No notifications sent yet.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Exceptions + system */}
        <div className="grid items-start gap-5 xl:grid-cols-3">
          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
              <h2 className="text-[13.5px] font-bold text-zinc-950">Failed payments</h2>
              <Link href="/payments" className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-950 hover:underline">
                All payments →
              </Link>
            </div>
            <ul className="space-y-3 p-4 sm:p-5">
              {failedList.map((f) => (
                <li key={f.backendId} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[12.5px] font-semibold text-zinc-950">{f.order}</p>
                    <p className="text-[13px] font-bold tabular-nums">{f.amount}</p>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-zinc-600">{f.reason}</p>
                  <p className="mt-1 flex items-center justify-between text-[12px] text-zinc-500">
                    <span>{f.time}</span>
                    <Link href={`/orders/${f.backendId}`} className="font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600">
                      Open order
                    </Link>
                  </p>
                </li>
              ))}
              {loaded && failedList.length === 0 && (
                <li className="text-[13px] text-zinc-500">No failed payments. All clear.</li>
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
              <h2 className="text-[13.5px] font-bold text-zinc-950">Inventory warnings</h2>
              <Link href="/inventory" className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-950 hover:underline">
                Inventory →
              </Link>
            </div>
            <ul className="space-y-3 p-4 sm:p-5">
              {warnings.map((w) => (
                <li key={w.sku} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-zinc-950">{w.product}</p>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[11px] font-bold ${w.severity === "Out of stock" ? "bg-[#b3261e] text-white" : "bg-amber-100 text-amber-900"}`}>
                      {w.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[12px] text-zinc-500">
                    {w.sku} · {w.onHand} on hand
                  </p>
                </li>
              ))}
              {loaded && warnings.length === 0 && (
                <li className="text-[13px] text-zinc-500">Stock levels healthy.</li>
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-2.5 sm:px-5">
              <h2 className="text-[13.5px] font-bold text-zinc-950">Recent system events</h2>
            </div>
            <ul className="space-y-2.5 p-4 sm:p-5">
              {SYSTEM_EVENTS.map((s) => (
                <li key={s.text} className="flex items-start gap-2.5 text-[12.5px]">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.tone === "ok" ? "bg-green-700" : s.tone === "warn" ? "bg-amber-500" : "bg-zinc-300"}`}
                  />
                  <span className="flex-1 leading-snug text-zinc-700">{s.text}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">{s.time}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
