import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { PIPELINE, RECENT_ORDERS, SERVICES, RECENT_EVENTS } from "@/data/overview";

function statusPill(s: string) {
  if (s === "Delivered" || s === "Operational") return "bg-green-100 text-green-900";
  if (s === "Degraded" || s === "Retrying" || s === "Packed" || s === "Picking") return "bg-amber-100 text-amber-900";
  if (s === "Down" || s === "Dead-letter") return "bg-[#b3261e] text-white";
  if (s === "Refunded") return "bg-zinc-200 text-zinc-700";
  return "bg-zinc-100 text-zinc-700";
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
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
      {children}
    </section>
  );
}

export default function DashboardPage() {
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
        {/* Pipeline strip */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white lg:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <div key={p.label} className={`px-4 py-3.5 sm:px-5 ${i > 0 ? "border-l border-zinc-200" : ""} ${i === 2 ? "max-lg:border-l-0 max-lg:border-t max-lg:border-zinc-200" : ""} ${i === 3 ? "max-lg:border-t max-lg:border-zinc-200" : ""}`}>
              <dt className="text-[12px] font-medium text-zinc-500">{p.label}</dt>
              <dd className="mt-0.5 text-[24px] font-bold tabular-nums tracking-tight text-zinc-950">{p.count}</dd>
            </div>
          ))}
        </dl>

        {/* Orders */}
        <Section title="Recent orders" action={{ label: "View all orders", href: "/orders" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-200 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                  <th className="px-4 py-2.5 font-semibold sm:px-5">Order</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Items</th>
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
                    <td className="px-4 py-2.5 tabular-nums text-zinc-600">{o.items}</td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums">{o.total}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 text-[11.5px] font-semibold ${statusPill(o.status)}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 sm:px-5">{o.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Services */}
          <Section title="Service health" action={{ label: "All services", href: "/services" }}>
            <ul className="divide-y divide-zinc-100">
              {SERVICES.map((s) => (
                <li key={s.name} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${s.status === "Operational" ? "bg-green-700" : s.status === "Degraded" ? "bg-amber-500" : "bg-[#b3261e]"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12.5px] font-semibold text-zinc-950">{s.name}</span>
                    <span className="block text-[12px] text-zinc-500">p99 {s.latency} · errors {s.errorRate}</span>
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 text-[11.5px] font-semibold ${statusPill(s.status)}`}>{s.status}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Events */}
          <Section title="Recent platform events" action={{ label: "Event stream", href: "/events" }}>
            <ul className="divide-y divide-zinc-100">
              {RECENT_EVENTS.map((e) => (
                <li key={e.type + e.time} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12.5px] font-semibold text-zinc-950">{e.type}</span>
                    <span className="block truncate text-[12px] text-zinc-500">
                      {e.order} · {e.service} · {e.time}
                    </span>
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 text-[11.5px] font-semibold ${statusPill(e.state)}`}>{e.state}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </AdminShell>
  );
}
