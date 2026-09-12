import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { orderBadge, paymentBadge } from "@/components/orders/badges";
import OrderActions from "@/components/orders/OrderActions";
import { ORDERS } from "@/data/orders";
import { buildFlow, shipInfo, stockLines, type FlowState } from "@/lib/orderEvents";

export function generateStaticParams() {
  return ORDERS.map((o) => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id} | Volt Ops` };
}

function gbp(v: number) {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
      <h2 className="border-b border-zinc-200 px-4 py-2.5 text-[13px] font-bold text-zinc-950 sm:px-5">{title}</h2>
      <div className="px-4 py-3.5 sm:px-5">{children}</div>
    </section>
  );
}

function stateBadge(state: FlowState) {
  if (state === "done") return <Badge variant="success">Completed</Badge>;
  if (state === "failed") return <Badge variant="danger">Failed</Badge>;
  if (state === "compensated") return <Badge variant="warning">Compensation</Badge>;
  if (state === "pending") return <Badge variant="outline">Pending</Badge>;
  return <Badge variant="muted">Skipped</Badge>;
}

function stateDot(state: FlowState) {
  if (state === "done") return "bg-green-700";
  if (state === "failed") return "bg-[#b3261e]";
  if (state === "compensated") return "bg-amber-500";
  if (state === "pending") return "border-2 border-zinc-400 bg-white";
  return "bg-zinc-200";
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = ORDERS.find((o) => o.id === id);
  if (!order) notFound();

  const flow = buildFlow(order);
  const stock = stockLines(order);
  const ship = shipInfo(order);
  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
  const hasCompensation = flow.some((e) => e.compensation);

  return (
    <AdminShell
      crumbs={[{ label: "Sell" }, { label: "Orders", href: "/orders" }, { label: order.id }]}
      title={order.id}
      actions={<OrderActions order={order} />}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
        <Badge variant={orderBadge(order.status)}>{order.status}</Badge>
        <Badge variant={paymentBadge(order.payment)}>{order.payment}</Badge>
        <span className="text-zinc-500">{order.created} · {itemCount} {itemCount === 1 ? "item" : "items"} · {gbp(order.total)}</span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {/* Items + total */}
          <Panel title={`Items (${itemCount})`}>
            <ul className="divide-y divide-zinc-100">
              {order.items.map((i) => (
                <li key={i.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-zinc-950">{i.name}</span>
                    <span className="text-[12.5px] text-zinc-500">Qty {i.qty} × {gbp(i.price)}</span>
                  </span>
                  <span className="text-[13.5px] font-bold tabular-nums">{gbp(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-[13.5px]">
              <div className="flex justify-between text-zinc-600"><dt>Subtotal</dt><dd className="tabular-nums">{gbp(order.total)}</dd></div>
              <div className="flex justify-between text-zinc-600"><dt>Delivery</dt><dd>{order.total >= 50 ? "Free" : "£3.99"}</dd></div>
              <div className="flex justify-between text-[16px] font-bold text-zinc-950"><dt>Total</dt><dd className="tabular-nums">{gbp(order.total)}</dd></div>
            </dl>
          </Panel>

          {/* Inventory */}
          <Panel title="Inventory reservations">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                    <th className="py-2 pr-3 font-semibold">SKU</th>
                    <th className="py-2 pr-3 font-semibold">Item</th>
                    <th className="py-2 pr-3 font-semibold">Location</th>
                    <th className="py-2 font-semibold">Reservation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stock.map((s) => (
                    <tr key={s.sku}>
                      <td className="py-2 pr-3 font-mono text-[12px] font-semibold text-zinc-950">{s.sku}</td>
                      <td className="py-2 pr-3 text-zinc-800">{s.name} <span className="text-zinc-500">×{s.qty}</span></td>
                      <td className="py-2 pr-3 text-zinc-600">{s.location}</td>
                      <td className="py-2">
                        <Badge variant={s.reservation === "Released" ? "warning" : s.reservation === "Awaiting payment" ? "outline" : "success"}>
                          {s.reservation}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Event flow */}
          <Panel title="Event flow — saga lifecycle">
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-500" aria-label="Timeline legend">
              <span><span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-700" />Completed</span>
              <span><span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#b3261e]" />Failed</span>
              <span><span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />Compensation</span>
              <span><span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full border-2 border-zinc-400 bg-white" />Pending</span>
            </div>
            <ol>
              {flow.map((e, i) => (
                <li key={e.type} className="flex gap-3.5">
                  <span className="flex flex-col items-center" aria-hidden="true">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${stateDot(e.state)}`} />
                    {i < flow.length - 1 && (
                      <span className={`w-px flex-1 ${e.compensation ? "bg-amber-400" : e.state === "done" ? "bg-green-700" : "bg-zinc-200"}`} />
                    )}
                  </span>
                  <div className={`min-w-0 flex-1 pb-5 ${e.compensation ? "rounded-sm border border-amber-300 bg-amber-50 px-3 py-2.5" : ""}`}>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <code className="font-mono text-[13px] font-bold text-zinc-950">{e.type}</code>
                      {stateBadge(e.state)}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">{e.detail}</p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-zinc-400">{e.service} · {e.at}</p>
                  </div>
                </li>
              ))}
            </ol>
            {hasCompensation && (
              <p className="rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-zinc-700">
                Compensation executed: the failed payment triggered <code className="font-mono text-[12px] text-zinc-950">inventory.release</code> so
                reserved units returned to sellable stock. No charge was made.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Current status">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Order</dt><dd><Badge variant={orderBadge(order.status)}>{order.status}</Badge></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Payment</dt><dd><Badge variant={paymentBadge(order.payment)}>{order.payment}</Badge></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Placed</dt><dd className="font-medium">{order.created}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Items</dt><dd className="tabular-nums">{itemCount}</dd></div>
              <div className="flex justify-between gap-3 border-t border-zinc-100 pt-2 text-[15px] font-bold"><dt>Total</dt><dd className="tabular-nums">{gbp(order.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Customer">
            <p className="text-[13.5px] font-semibold text-zinc-950">{order.customer}</p>
            <p className="text-[12.5px] text-zinc-600">{order.email}</p>
            <div className="mt-2 border-t border-zinc-100 pt-2 text-[13px] leading-relaxed text-zinc-700">
              {ship.address.map((l) => <p key={l}>{l}</p>)}
            </div>
          </Panel>

          <Panel title="Payment">
            <p className="text-[13.5px] font-semibold text-zinc-950">{order.payMethod}</p>
            <p className="mt-1 text-[12.5px] text-zinc-600">Status: {order.payment}</p>
            <p className="mt-1 text-[12.5px] text-zinc-600">3-D Secure: passed</p>
          </Panel>

          <Panel title="Shipping">
            <p className="text-[13.5px] font-semibold text-zinc-950">{ship.method}</p>
            {ship.tracking ? (
              <>
                <p className="mt-1 font-mono text-[12.5px] text-zinc-800">{ship.tracking}</p>
                <p className="mt-1 text-[12.5px] text-zinc-600">Dispatched {ship.dispatchedAt} · {ship.eta}</p>
              </>
            ) : (
              <p className="mt-1 text-[12.5px] text-zinc-600">{ship.eta}</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/orders" className="text-[13px] font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
          ← Back to all orders
        </Link>
      </div>
    </AdminShell>
  );
}
