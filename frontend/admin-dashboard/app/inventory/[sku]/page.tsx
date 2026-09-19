"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import SkuDetail from "@/components/inventory/SkuDetail";
import type { Sku } from "@/data/inventory";
import type { Reservation } from "@/lib/api";
import {
  ApiError,
  apiGetStock,
  apiReleaseOrder,
} from "@/lib/api";
import { toSku } from "@/lib/backend";
import { useRequireAdmin } from "@/lib/auth";

export default function SkuPage() {
  useRequireAdmin();
  const params = useParams<{ sku: string }>();
  const skuId = params.sku;
  const [sku, setSku] = useState<Sku | null>(null);
  const [reservations, setReservations] = useState<Reservation[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await apiGetStock(skuId);
        if (cancelled) return;
        setSku(toSku(detail));
        setReservations(detail.reservations);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 404
            ? `SKU ${skuId} not found.`
            : e instanceof ApiError
              ? e.message
              : "Could not load the SKU.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skuId, reloadToken]);

  const release = useCallback(async (orderId: string) => {
    await apiReleaseOrder(orderId);
    setReloadToken((t) => t + 1);
  }, []);

  return (
    <AdminShell
      crumbs={[{ label: "Catalogue" }, { label: "Inventory", href: "/inventory" }, { label: skuId }]}
      title={sku?.product ?? skuId}
    >
      {error ? (
        <p role="alert" className="max-w-2xl rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3 text-[14px] text-[#8f1d17]">
          {error}
        </p>
      ) : !sku ? (
        <p className="text-[14px] text-zinc-600">Loading SKU…</p>
      ) : (
        <SkuDetail sku={sku} liveReservations={reservations} onRelease={release} />
      )}
    </AdminShell>
  );
}
