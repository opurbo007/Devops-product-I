"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import {
  ApiError,
  apiDispatchShipment,
  apiGetTracking,
  apiListShipments,
  apiUpdateShipment,
  type Shipment,
} from "@/lib/api";
import { useRequireAdmin } from "@/lib/auth";

function statusBadge(s: string) {
  if (s === "delivered") return <Badge variant="success">Delivered</Badge>;
  if (s === "failed") return <Badge variant="danger">Failed</Badge>;
  if (s === "dispatched" || s === "in_transit") return <Badge variant="outline">{s.replace(/_/g, " ")}</Badge>;
  return <Badge variant="muted">{s}</Badge>;
}

export default function ShipmentsPage() {
  useRequireAdmin();
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Shipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [tracked, setTracked] = useState<Shipment | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState("");
  const [dispatchCarrier, setDispatchCarrier] = useState("");
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiListShipments(status || undefined)
      .then((list) => {
        if (!cancelled) {
          setRows(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load shipments.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const reload = async () => {
    try {
      setRows(await apiListShipments(status || undefined));
    } catch {
      /* keep stale rows */
    }
  };

  const changeStatus = async (orderId: string, next: string) => {
    setUpdating(orderId);
    try {
      const updated = await apiUpdateShipment(orderId, { status: next });
      setRows((prev) => prev?.map((s) => (s.orderId === orderId ? updated : s)) ?? prev);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Status update failed.");
    } finally {
      setUpdating(null);
    }
  };

  const doTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const tn = trackInput.trim();
    if (!tn) return;
    setTracking(true);
    setTrackError(null);
    setTracked(null);
    try {
      setTracked(await apiGetTracking(tn));
    } catch (err) {
      setTrackError(
        err instanceof ApiError && err.status === 404
          ? "No shipment found for that tracking number."
          : err instanceof ApiError
            ? err.message
            : "Lookup failed.",
      );
    } finally {
      setTracking(false);
    }
  };

  const doDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = dispatchOrder.trim();
    if (!orderId) return;
    setDispatching(true);
    setDispatchMsg(null);
    try {
      const res = await apiDispatchShipment(orderId, {
        ...(dispatchCarrier.trim() ? { carrier: dispatchCarrier.trim() } : {}),
      });
      setDispatchMsg(
        res.created
          ? `Dispatched — tracking ${res.trackingNumber ?? "pending"}.`
          : "Already shipped — no duplicate event emitted.",
      );
      setDispatchOrder("");
      setDispatchCarrier("");
      void reload();
    } catch (err) {
      setDispatchMsg(err instanceof ApiError ? err.message : "Dispatch failed.");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <AdminShell
      crumbs={[{ label: "Fulfilment" }, { label: "Shipments" }]}
      title="Shipments"
      actions={
        <span className="text-[13px] tabular-nums text-zinc-500" aria-live="polite">
          {rows === null ? "Loading…" : `${rows.length} shipments`}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Dropdown
          label="Status"
          ariaLabel="Filter by shipment status"
          allLabel="All shipments"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setRows(null);
          }}
          options={[
            { value: "dispatched", label: "Dispatched" },
            { value: "in_transit", label: "In transit" },
            { value: "delivered", label: "Delivered" },
            { value: "failed", label: "Failed" },
          ]}
        />
      </div>

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-2">
        {/* Tracking lookup */}
        <form
          onSubmit={doTrack}
          className="rounded-sm border border-zinc-200 bg-white px-4 py-3.5 sm:px-5"
        >
          <h2 className="text-[13px] font-bold text-zinc-950">Track a parcel</h2>
          <div className="mt-2 flex gap-2">
            <label htmlFor="ship-track" className="sr-only">Tracking number</label>
            <input
              id="ship-track"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="e.g. TRACK-A1B2C3D4"
              className="h-10 min-w-0 flex-1 rounded-sm border border-zinc-300 px-3 font-mono text-[13px] focus:border-zinc-950 focus:outline-none"
            />
            <button
              type="submit"
              disabled={tracking}
              className="h-10 rounded-sm bg-zinc-950 px-4 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {tracking ? "…" : "Track"}
            </button>
          </div>
          {trackError && (
            <p role="alert" className="mt-2 text-[12.5px] font-medium text-[#8f1d17]">{trackError}</p>
          )}
          {tracked && (
            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex justify-between gap-2"><dt className="text-zinc-500">Status</dt><dd className="font-semibold capitalize">{tracked.status.replace(/_/g, " ")}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-zinc-500">Carrier</dt><dd className="font-semibold">{tracked.carrier ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-zinc-500">Order</dt><dd><Link href={`/orders/${tracked.orderId}`} className="font-mono text-[12px] font-semibold hover:underline">{tracked.orderId.slice(0, 8).toUpperCase()}</Link></dd></div>
            </dl>
          )}
        </form>

        {/* Manual dispatch (ops / DLQ recovery) */}
        <form
          onSubmit={doDispatch}
          className="rounded-sm border border-zinc-200 bg-white px-4 py-3.5 sm:px-5"
        >
          <h2 className="text-[13px] font-bold text-zinc-950">Dispatch a paid order</h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">
            Idempotent — already-shipped orders emit nothing.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="dispatch-order" className="sr-only">Order ID</label>
            <input
              id="dispatch-order"
              value={dispatchOrder}
              onChange={(e) => setDispatchOrder(e.target.value)}
              placeholder="Order UUID"
              className="h-10 min-w-0 flex-1 rounded-sm border border-zinc-300 px-3 font-mono text-[12.5px] focus:border-zinc-950 focus:outline-none"
            />
            <label htmlFor="dispatch-carrier" className="sr-only">Carrier (optional)</label>
            <input
              id="dispatch-carrier"
              value={dispatchCarrier}
              onChange={(e) => setDispatchCarrier(e.target.value)}
              placeholder="Carrier (optional)"
              className="h-10 w-full rounded-sm border border-zinc-300 px-3 text-[13px] focus:border-zinc-950 focus:outline-none sm:w-40"
            />
            <button
              type="submit"
              disabled={dispatching}
              className="h-10 rounded-sm bg-zinc-950 px-4 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {dispatching ? "…" : "Dispatch"}
            </button>
          </div>
          {dispatchMsg && (
            <p aria-live="polite" className="mt-2 text-[12.5px] font-medium text-zinc-800">{dispatchMsg}</p>
          )}
        </form>
      </div>

      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <Table className="min-w-[900px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>Order</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Carrier</TableHeadCell>
              <TableHeadCell>Tracking</TableHeadCell>
              <TableHeadCell>Dispatched</TableHeadCell>
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {error ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">Couldn&apos;t reach the API</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">{error}</p>
                </td>
              </tr>
            ) : rows === null ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-[13.5px] text-zinc-600">
                  Loading shipments…
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/orders/${s.orderId}`} className="font-mono text-[12.5px] font-semibold text-zinc-950 hover:underline">
                      {s.orderId.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className="text-zinc-700">{s.carrier ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[12.5px] text-zinc-800">
                    {s.trackingNumber ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-zinc-600">
                    {new Date(s.dispatchedAt).toLocaleString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <label className="sr-only" htmlFor={`ship-status-${s.id}`}>Update status</label>
                    <select
                      id={`ship-status-${s.id}`}
                      value={s.status}
                      disabled={updating === s.orderId}
                      onChange={(e) => void changeStatus(s.orderId, e.target.value)}
                      className="h-9 rounded-sm border border-zinc-300 bg-white px-2 text-[12.5px] font-semibold focus:border-zinc-950 focus:outline-none disabled:opacity-60"
                    >
                      {["dispatched", "in_transit", "delivered", "failed"].map((v) => (
                        <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-[13.5px] text-zinc-600">
                  No shipments found.
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}

