"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AdjustStock, RaisePO } from "./StockActions";
import type { Sku } from "@/data/inventory";
import {
  coverOf,
  eventsFor,
  reservationsFor,
  statusOf,
  totalOf,
  type StockEvent,
} from "@/lib/inventory";

function statusBadge(s: Sku, available: number) {
  const st = available <= 0 ? "Out of stock" : available <= s.reorderPoint ? "Low" : "In stock";
  if (st === "Out of stock") return <Badge variant="danger">Out of stock</Badge>;
  if (st === "Low") return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

function eventDot(kind: StockEvent["kind"]) {
  if (kind === "Received") return "bg-green-700";
  if (kind === "Released" || kind === "Adjusted") return "bg-amber-500";
  if (kind === "Picked") return "bg-zinc-950";
  if (kind === "Reserved") return "bg-zinc-400";
  return "bg-zinc-300";
}

export default function SkuDetail({ sku }: { sku: Sku }) {
  const [available, setAvailable] = useState(sku.available);
  const [extraEvents, setExtraEvents] = useState<StockEvent[]>([]);
  const events = [...extraEvents, ...eventsFor(sku)];
  const reservations = reservationsFor({ ...sku, available });
  const total = available + sku.reserved;
  const needsPO = available <= sku.reorderPoint;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-zinc-950">{sku.sku}</span>
        {statusBadge(sku, available)}
        <Badge variant={sku.grade === "New" ? "muted" : "outline"}>{sku.grade}</Badge>
        <span className="text-[13px] text-zinc-500">{sku.brand} · {sku.category} · {sku.location}</span>
      </div>

      {/* Stat strip */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white md:grid-cols-4">
        {[
          ["Available", String(available)],
          ["Reserved", String(sku.reserved)],
          ["Total on hand", String(total)],
          ["Cover", available <= 0 ? "Out of stock" : coverOf({ ...sku, available })],
        ].map(([label, value], i) => (
          <div key={label} className={`px-4 py-3.5 sm:px-5 ${i % 2 === 1 ? "border-l border-zinc-200" : ""} ${i >= 2 ? "max-md:border-t md:border-l md:border-zinc-200" : ""} ${i === 0 ? "md:border-l-0" : ""}`}>
            <dt className="text-[12px] font-medium text-zinc-500">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-zinc-950">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12.5px] text-zinc-500">
        Reorder point: {sku.reorderPoint} units · Replenishment lead time 6 working days · Last movement {sku.updatedMin < 60 ? `${Math.round(sku.updatedMin)} min ago` : `${Math.round(sku.updatedMin / 60)} h ago`}
      </p>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {/* Active reservations */}
          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-4 py-2.5 text-[13px] font-bold text-zinc-950 sm:px-5">
              Active reservations ({reservations.reduce((n, r) => n + r.qty, 0)} units)
            </h2>
            {reservations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                      <th className="px-4 py-2.5 font-semibold sm:px-5">Order</th>
                      <th className="px-4 py-2.5 font-semibold">Qty</th>
                      <th className="px-4 py-2.5 font-semibold">Reserved</th>
                      <th className="px-4 py-2.5 font-semibold">Expires in</th>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {reservations.map((r) => (
                      <tr key={r.order} className="hover:bg-zinc-50">
                        <td className="px-4 py-2.5 sm:px-5">
                          <Link href={`/orders/${r.order}`} className="font-mono text-[12.5px] font-semibold text-zinc-950 hover:underline">
                            {r.order}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">{r.qty}</td>
                        <td className="px-4 py-2.5 text-zinc-600">{r.reservedAt}</td>
                        <td className="px-4 py-2.5 tabular-nums text-zinc-600">{r.expiresIn}</td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <Badge variant={r.state === "Expiring soon" ? "warning" : r.state === "Picking" ? "outline" : "success"}>
                            {r.state}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-5 text-[13px] text-zinc-600 sm:px-5">
                No active reservations — {available > 0 ? `all ${available} units are sellable.` : "nothing to reserve."}
              </p>
            )}
          </section>

          {/* Recent events */}
          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-4 py-2.5 text-[13px] font-bold text-zinc-950 sm:px-5">
              Recent inventory events
            </h2>
            <ul className="divide-y divide-zinc-100 px-4 sm:px-5">
              {events.map((e, i) => (
                <li key={`${e.kind}-${i}`} className="flex items-start gap-3 py-2.5">
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventDot(e.kind)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-zinc-800">
                      <strong className="font-semibold text-zinc-950">{e.kind}</strong> — {e.detail}
                    </span>
                    <span className="block text-[12px] text-zinc-500">{e.by} · {e.at}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-4 py-2.5 text-[13px] font-bold text-zinc-950 sm:px-5">Product</h2>
            <dl className="space-y-2 px-4 py-3.5 text-[13px] sm:px-5">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Name</dt><dd className="text-right font-medium">{sku.product}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Brand</dt><dd className="font-medium">{sku.brand}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Category</dt><dd className="font-medium">{sku.category}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Grade</dt><dd className="font-medium">{sku.grade}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Location</dt><dd className="font-medium">{sku.location}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Total on hand</dt><dd className="font-bold tabular-nums">{totalOf({ ...sku, available })}</dd></div>
            </dl>
            <div className="border-t border-zinc-200 px-4 py-3.5 sm:px-5">
              <AdjustStock
                sku={sku.sku}
                onAdjusted={(delta, ev) => {
                  setAvailable((a) => Math.max(0, a + delta));
                  setExtraEvents((prev) => [ev, ...prev]);
                }}
              />
            </div>
          </section>

          {needsPO && (
            <RaisePO sku={sku.sku} suggested={Math.max(20, (sku.reorderPoint - available + 8) * 4)} />
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link href="/inventory" className="text-[13px] font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
          ← Back to all SKUs
        </Link>
      </div>
    </div>
  );
}
