import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  STATS,
  RECENT_ORDERS,
  STATUS_DISTRIBUTION,
  EVENT_TYPES,
  HOURLY_VOLUME,
  EVENT_FEED,
  FAILED_PAYMENTS,
  STOCK_WARNINGS,
  SYSTEM_EVENTS,
} from "@/data/dashboard";

function orderPill(s: string) {
  if (s === "Delivered") return "bg-green-100 text-green-900";
  if (s === "Packed" || s === "Picking" || s === "Shipped") return "bg-amber-100 text-amber-900";
  if (s === "Refunded") return "bg-zinc-200 text-zinc-700";
  return "bg-zinc-100 text-zinc-700";
}

function eventStatePill(s: string) {
  if (s === "Delivered") return "bg-green-100 text-green-900";
  if (s === "Retrying") return "bg-amber-100 text-amber-900";
  return "bg-[#b3261e] text-white";
}

function Section({
  title,
  action,
  children,
  padded = true,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
        <h2 className="text-[13.5px] font-bold text-zinc-950">{title}</h2>
        {action && (
          <Link href={action.href} className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-950 hover:underline">
            {action.label} →
          </Link>
        )}
      </div>
      <div className={padded ? "p-4 sm:p-5" : ""}>{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const distTotal = STATUS_DISTRIBUTION.reduce((n, d) => n + d.count, 0);
  const maxHour = Math.max(...HOURLY_VOLUME);

  return (
    <AdminShell
      crumbs={[{ label: "Overview" }, { label: "Dashboard" }]}
      title="Good afternoon, Amara"
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
        {/* KPI strip */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white md:grid-cols-3 xl:grid-cols-6">
          {STATS.map((s, i) => (
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
          <Section title="Recent orders" action={{ label: "View all orders", href: "/orders" }} padded={false}>
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
                  {RECENT_ORDERS.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 font-mono text-[12.5px] font-semibold text-zinc-950 sm:px-5">{o.id}</td>
                      <td className="px-4 py-2.5 text-zinc-800">{o.customer}</td>
                      <td className="px-4 py-2.5 font-semibold tabular-nums">{o.total}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 text-[11.5px] font-semibold ${orderPill(o.status)}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 sm:px-5">{o.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Status distribution — bars beat a pie here: exact counts, comparable at a glance */}
          <Section title="Today's orders by status">
            <ul className="space-y-2.5" aria-label="Order status distribution, 142 orders today">
              {STATUS_DISTRIBUTION.map((d) => {
                const pct = Math.round((d.count / distTotal) * 100);
                return (
                  <li key={d.status}>
                    <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                      <span className="font-medium text-zinc-700">{d.status}</span>
                      <span className="tabular-nums text-zinc-500">{d.count} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100" role="img" aria-label={`${d.status}: ${d.count} orders, ${pct} percent`}>
                      <div className="h-full rounded-full bg-zinc-950" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-zinc-100 pt-3 text-[12px] text-zinc-500">
              {distTotal} orders today · fulfilment SLA 24h · oldest unshipped 6h 12m
            </p>
          </Section>
        </div>

        {/* Event activity */}
        <Section title="Event activity — last 24 hours" action={{ label: "Event stream", href: "/events" }}>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              {/* Hourly volume — the one chart that earns its place: gaps here mean a stuck consumer */}
              <div className="flex h-24 items-end gap-[3px]" role="img" aria-label="Events published per hour, peak 104 at midday">
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
                    <span className={`tabular-nums ${e.errorRate !== "0.00%" && e.errorRate !== "0.04%" && e.errorRate !== "0.11%" ? "font-semibold text-[#b3261e]" : "text-zinc-500"}`}>
                      err {e.errorRate}
                    </span>
                    <span className={`tabular-nums ${e.lag === "42s" ? "font-semibold text-amber-800" : "text-zinc-500"}`}>
                      lag {e.lag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500">Latest events</p>
              <ul className="divide-y divide-zinc-100 border-y border-zinc-100">
                {EVENT_FEED.map((e) => (
                  <li key={e.type + e.time} className="flex items-center gap-3 py-2">
                    <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${e.state === "Delivered" ? "bg-green-700" : e.state === "Retrying" ? "bg-amber-500" : "bg-[#b3261e]"}`} />
                    <span className="min-w-0 flex-1">
                      <code className="block truncate font-mono text-[12.5px] font-semibold text-zinc-950">{e.type}</code>
                      <span className="block truncate text-[12px] text-zinc-500">{e.ref} · {e.time}</span>
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[11px] font-semibold ${eventStatePill(e.state)}`}>{e.state}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Exceptions + system */}
        <div className="grid items-start gap-5 xl:grid-cols-3">
          <Section title="Failed payments" action={{ label: "All payments", href: "/payments" }}>
            <ul className="space-y-3">
              {FAILED_PAYMENTS.map((f) => (
                <li key={f.order} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[12.5px] font-semibold text-zinc-950">{f.order}</p>
                    <p className="text-[13px] font-bold tabular-nums">{f.amount}</p>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-zinc-600">{f.reason}</p>
                  <p className="mt-1 flex items-center justify-between text-[12px] text-zinc-500">
                    <span>{f.customer} · attempt {f.attempts} · {f.time}</span>
                    <button className="font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600">Retry</button>
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Inventory warnings" action={{ label: "Inventory", href: "/inventory" }}>
            <ul className="space-y-3">
              {STOCK_WARNINGS.map((w) => (
                <li key={w.sku} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-zinc-950">{w.product}</p>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[11px] font-bold ${w.severity === "Out of stock" ? "bg-[#b3261e] text-white" : "bg-amber-100 text-amber-900"}`}>
                      {w.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[12px] text-zinc-500">
                    {w.sku} · {w.onHand} on hand · cover {w.cover}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Recent system events">
            <ul className="space-y-2.5">
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
            <p className="mt-3 border-t border-zinc-100 pt-3 text-[12px] text-zinc-500">
              Deploys, rotations and platform alerts — full history in the audit log.
            </p>
          </Section>
        </div>
      </div>
    </AdminShell>
  );
}
