"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ApiError, apiListOrders, type Order } from "@/lib/api";
import { gbp } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  reserved: "bg-sky-100 text-sky-900",
  paid: "bg-indigo-100 text-indigo-900",
  shipped: "bg-green-100 text-green-900",
  failed: "bg-red-100 text-red-900",
  cancelled: "bg-zinc-200 text-zinc-700",
  refunded: "bg-purple-100 text-purple-900",
};

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    apiListOrders(user.id)
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load orders.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-zinc-500">
            <ol className="flex items-center gap-1.5">
              <li><Link href="/" className="hover:text-zinc-950 hover:underline">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-semibold text-zinc-900">Orders</li>
            </ol>
          </nav>
          <h1 className="text-[26px] font-bold tracking-tight text-zinc-950 sm:text-[30px]">
            Your orders
          </h1>

          {!ready || (user && orders === null && !error) ? (
            <p className="mt-6 text-[14px] text-zinc-600">Loading orders…</p>
          ) : !user ? (
            <div className="mt-6 max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-10 text-center">
              <p className="text-[14px] text-zinc-600">Sign in to see your orders.</p>
              <div className="mt-5">
                <Link href="/login?next=/orders">
                  <Button size="lg" className="w-full">Sign in</Button>
                </Link>
              </div>
            </div>
          ) : error ? (
            <p role="alert" className="mt-6 max-w-2xl rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3 text-[14px] text-[#8f1d17]">
              {error}
            </p>
          ) : orders!.length === 0 ? (
            <div className="mt-6 max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-10 text-center">
              <p className="text-[14px] text-zinc-600">No orders yet — your saga starts here.</p>
              <div className="mt-5">
                <Link href="/products">
                  <Button size="lg" className="w-full">Browse laptops</Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders!.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-sm border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-950"
                  >
                    <span className="font-mono text-[13px] font-semibold text-zinc-950">
                      {o.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${STATUS_STYLES[o.status] ?? "bg-zinc-100 text-zinc-700"}`}
                    >
                      {o.status}
                    </span>
                    <span className="text-[13.5px] text-zinc-600">
                      {o.items.reduce((n, i) => n + i.qty, 0)} items
                    </span>
                    <span className="ml-auto text-[15px] font-bold text-zinc-950">
                      {gbp(Number(o.total))}
                    </span>
                    <span className="w-full text-[12px] text-zinc-500 sm:w-auto">
                      {new Date(o.created_at).toLocaleString("en-GB")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
