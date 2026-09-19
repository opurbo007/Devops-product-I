"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ApiError,
  apiGetOrder,
  apiGetPaymentByOrder,
  apiGetShipmentByOrder,
  apiListNotifications,
  type Notification,
  type Order,
  type Payment,
  type Shipment,
} from "@/lib/api";
import { gbp } from "@/lib/format";

const STEPS = ["pending", "reserved", "paid", "shipped"] as const;

function stepIndex(status: string): number {
  const i = STEPS.indexOf(status as (typeof STEPS)[number]);
  return i === -1 ? 0 : i;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const o = await apiGetOrder(id);
        if (cancelled) return;
        setOrder(o);
        const [pay, ship, notes] = await Promise.allSettled([
          apiGetPaymentByOrder(id),
          apiGetShipmentByOrder(id),
          apiListNotifications(id),
        ]);
        if (cancelled) return;
        if (pay.status === "fulfilled") setPayment(pay.value);
        if (ship.status === "fulfilled") setShipment(ship.value);
        if (notes.status === "fulfilled") setNotifications(notes.value);
        // Keep polling until the saga reaches a terminal state.
        if (["shipped", "failed", "cancelled", "refunded"].includes(o.status)) {
          if (timer) clearInterval(timer);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load the order.");
          if (timer) clearInterval(timer);
        }
      }
    };

    void load();
    timer = setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  const failed = order?.status === "failed";

  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-zinc-500">
            <ol className="flex items-center gap-1.5">
              <li><Link href="/" className="hover:text-zinc-950 hover:underline">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/orders" className="hover:text-zinc-950 hover:underline">Orders</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-mono font-semibold text-zinc-900">
                {id.slice(0, 8).toUpperCase()}
              </li>
            </ol>
          </nav>

          {error ? (
            <p role="alert" className="max-w-2xl rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3 text-[14px] text-[#8f1d17]">
              {error}
            </p>
          ) : !order ? (
            <p className="text-[14px] text-zinc-600">Loading order…</p>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0 space-y-5">
                <section className="rounded-sm border border-zinc-200 bg-white px-5 py-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-[20px] font-bold text-zinc-950">
                      {order.id.slice(0, 8).toUpperCase()}
                    </h1>
                    <span className="rounded-full bg-zinc-950 px-2.5 py-0.5 text-[12px] font-semibold capitalize text-white">
                      {order.status}
                    </span>
                    <span className="ml-auto text-[18px] font-bold">{gbp(Number(order.total))}</span>
                  </div>

                  {/* Saga progress */}
                  {!failed && order.status !== "cancelled" && order.status !== "refunded" ? (
                    <ol className="mt-5 flex items-center" aria-label="Order progress">
                      {STEPS.map((s, i) => {
                        const done = i <= stepIndex(order.status);
                        const current = STEPS[stepIndex(order.status)] === s;
                        return (
                          <li key={s} className="flex flex-1 items-center last:flex-none">
                            <div className="flex flex-col items-center">
                              <span
                                aria-hidden="true"
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
                                  done ? "bg-green-700 text-white" : "bg-zinc-200 text-zinc-500"
                                }`}
                              >
                                {done ? "✓" : i + 1}
                              </span>
                              <span className={`mt-1 text-[11.5px] capitalize ${current ? "font-bold text-zinc-950" : "text-zinc-500"}`}>
                                {s}
                              </span>
                            </div>
                            {i < STEPS.length - 1 && (
                              <span aria-hidden="true" className={`mx-1 mb-5 h-0.5 flex-1 ${i < stepIndex(order.status) ? "bg-green-700" : "bg-zinc-200"}`} />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="mt-4 rounded-sm bg-zinc-100 px-4 py-3 text-[13.5px] text-zinc-700">
                      {failed &&
                        "Payment failed — no money was taken and reserved stock was released automatically."}
                      {order.status === "cancelled" && "This order was cancelled."}
                      {order.status === "refunded" && "This order was refunded."}
                    </p>
                  )}
                </section>

                <section className="rounded-sm border border-zinc-200 bg-white px-5 py-5">
                  <h2 className="text-[15px] font-bold">Items</h2>
                  <ul className="mt-3 divide-y divide-zinc-100">
                    {order.items.map((item) => (
                      <li key={item.sku} className="flex items-center justify-between py-2 text-[13.5px]">
                        <span className="font-mono text-zinc-800">{item.sku}</span>
                        <span className="text-zinc-600">× {item.qty}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {notifications.length > 0 && (
                  <section className="rounded-sm border border-zinc-200 bg-white px-5 py-5">
                    <h2 className="text-[15px] font-bold">Updates</h2>
                    <ul className="mt-3 space-y-2">
                      {notifications.map((n) => (
                        <li key={n.id} className="flex items-center gap-3 text-[13px]">
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11.5px] text-zinc-700">
                            {n.template.replace(/_/g, " ")}
                          </span>
                          <span className="text-zinc-500">
                            {new Date(n.createdAt).toLocaleString("en-GB")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              <aside className="space-y-5">
                <section className="rounded-sm border border-zinc-200 bg-white px-5 py-5 text-[13.5px]">
                  <h2 className="text-[15px] font-bold">Payment</h2>
                  {payment ? (
                    <dl className="mt-3 space-y-1.5">
                      <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className="font-semibold capitalize">{payment.status}</dd></div>
                      <div className="flex justify-between"><dt className="text-zinc-500">Amount</dt><dd className="font-semibold">{gbp(payment.amountMinor / 100)} {payment.currency}</dd></div>
                      {payment.providerReference && (
                        <div className="flex justify-between gap-2"><dt className="text-zinc-500">Reference</dt><dd className="truncate font-mono text-[12px]">{payment.providerReference}</dd></div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-2 text-zinc-500">No payment yet.</p>
                  )}
                </section>

                <section className="rounded-sm border border-zinc-200 bg-white px-5 py-5 text-[13.5px]">
                  <h2 className="text-[15px] font-bold">Delivery</h2>
                  {shipment ? (
                    <dl className="mt-3 space-y-1.5">
                      <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className="font-semibold capitalize">{shipment.status.replace(/_/g, " ")}</dd></div>
                      {shipment.carrier && (
                        <div className="flex justify-between"><dt className="text-zinc-500">Carrier</dt><dd className="font-semibold">{shipment.carrier}</dd></div>
                      )}
                      {shipment.trackingNumber && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-500">Tracking</dt>
                          <dd>
                            <Link href={`/tracking/${shipment.trackingNumber}`} className="font-mono text-[12px] font-semibold text-zinc-950 hover:underline">
                              {shipment.trackingNumber}
                            </Link>
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-2 text-zinc-500">Not dispatched yet.</p>
                  )}
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
