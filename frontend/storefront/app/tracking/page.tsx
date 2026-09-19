"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ApiError, apiGetTracking, type Shipment } from "@/lib/api";

function TrackingView() {
  const searchParams = useSearchParams();
  const [tn, setTn] = useState(searchParams.get("tn") ?? "");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (value?: string) => {
    const needle = (value ?? tn).trim();
    if (!needle) return;
    setBusy(true);
    setError(null);
    setShipment(null);
    try {
      setShipment(await apiGetTracking(needle));
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? "No shipment found for that tracking number."
          : e instanceof ApiError
            ? e.message
            : "Lookup failed — try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[26px] font-bold tracking-tight text-zinc-950 sm:text-[30px]">
        Track your order
      </h1>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <label htmlFor="tracking-number" className="sr-only">Tracking number</label>
        <input
          id="tracking-number"
          value={tn}
          onChange={(e) => setTn(e.target.value)}
          placeholder="e.g. TRACK-A1B2C3D4"
          className="h-11 flex-1 rounded-sm border border-zinc-300 px-3 font-mono text-[14px] focus:border-zinc-950 focus:outline-none"
        />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "…" : "Track"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3 text-[14px] text-[#8f1d17]">
          {error}
        </p>
      )}

      {shipment && (
        <div className="mt-5 rounded-sm border border-zinc-200 bg-white px-5 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[15px] font-bold">{shipment.trackingNumber}</span>
            <span className="rounded-full bg-zinc-950 px-2.5 py-0.5 text-[12px] font-semibold capitalize text-white">
              {shipment.status.replace(/_/g, " ")}
            </span>
          </div>
          <dl className="mt-4 space-y-1.5 text-[13.5px]">
            {shipment.carrier && (
              <div className="flex justify-between"><dt className="text-zinc-500">Carrier</dt><dd className="font-semibold">{shipment.carrier}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-zinc-500">Dispatched</dt><dd className="font-semibold">{new Date(shipment.dispatchedAt).toLocaleString("en-GB")}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">Order</dt><dd><Link href={`/orders/${shipment.orderId}`} className="font-mono text-[12px] font-semibold hover:underline">{shipment.orderId.slice(0, 8).toUpperCase()}</Link></dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Suspense>
            <TrackingView />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
