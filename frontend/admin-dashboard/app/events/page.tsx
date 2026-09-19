"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import EventSheet from "@/components/events/EventSheet";
import {
  TOPICS,
  SERVICES,
  TYPES_BY_TOPIC,
  type StreamEvent,
} from "@/lib/events";
import { ApiError, apiListNotifications } from "@/lib/api";
import { notificationToEvent } from "@/lib/backend";
import { useRequireAdmin } from "@/lib/auth";

const BUFFER_MAX = 120;
const ALL_TYPES = Object.values(TYPES_BY_TOPIC).flat();

function statusBadge(s: StreamEvent["status"]) {
  if (s === "Delivered") return <Badge variant="success">Delivered</Badge>;
  if (s === "Retrying") return <Badge variant="warning">Retrying</Badge>;
  return <Badge variant="danger">Dead-letter</Badge>;
}

export default function EventsPage() {
  useRequireAdmin();
  // Live domain-event receipts (one row per sent notification) polled from
  // the backend; newest first, capped buffer — same shape as the old sim.
  const [buffer, setBuffer] = useState<StreamEvent[]>([]);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [service, setService] = useState("");
  const [type, setType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [selected, setSelected] = useState<StreamEvent | null>(null);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const notes = await apiListNotifications(undefined, BUFFER_MAX);
        if (cancelled) return;
        const rows = notes.map(notificationToEvent);
        setBuffer((prev) => {
          const seen = new Set(rows.map((r) => r.id));
          const kept = prev.filter((e) => !seen.has(e.id));
          return [...rows, ...kept].slice(0, BUFFER_MAX);
        });
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : "Event stream unavailable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void poll();
    const t = setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [live]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buffer.filter((e) => {
      if (q && ![e.order ?? "", e.correlationId, e.type].some((f) => f.toLowerCase().includes(q))) return false;
      if (topic && e.topic !== topic) return false;
      if (service && e.service !== service) return false;
      if (type && e.type !== type) return false;
      if (outcome === "success" && e.status !== "Delivered") return false;
      if (outcome === "failed" && e.status === "Delivered") return false;
      return true;
    });
  }, [buffer, query, topic, service, type, outcome]);

  const failed = buffer.filter((e) => e.status !== "Delivered").length;
  const activeCount = (topic ? 1 : 0) + (service ? 1 : 0) + (type ? 1 : 0) + (outcome ? 1 : 0) + (query.trim() ? 1 : 0);

  const clearAll = () => {
    setQuery("");
    setTopic("");
    setService("");
    setType("");
    setOutcome("");
  };

  const typeOptions = (topic ? TYPES_BY_TOPIC[topic] ?? ALL_TYPES : ALL_TYPES).map((t) => ({ value: t, label: t }));

  return (
    <AdminShell
      crumbs={[{ label: "Platform" }, { label: "Events" }]}
      title="Event stream"
      actions={
        <button
          onClick={() => setLive((v) => !v)}
          aria-pressed={live}
          className={`inline-flex h-9 items-center gap-2 rounded-sm border px-3.5 text-[13px] font-semibold ${
            live ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-950"
          }`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-green-400" : "bg-zinc-400"}`} />
          {live ? "Live — pause" : "Paused — resume"}
        </button>
      }
    >
      {/* Topic summary strip */}
      <dl className="mb-4 grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white md:grid-cols-5">
        {TOPICS.map((t, i) => {
          const n = buffer.filter((e) => e.topic === t).length;
          const bad = buffer.filter((e) => e.topic === t && e.status !== "Delivered").length;
          return (
            <button
              key={t}
              onClick={() => setTopic((cur) => (cur === t ? "" : t))}
              aria-pressed={topic === t}
              className={`border-zinc-200 px-4 py-3 text-left hover:bg-zinc-50 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-md:border-t" : ""} ${i > 0 ? "md:border-l" : ""} ${topic === t ? "bg-zinc-950 text-white hover:bg-zinc-950" : ""}`}
            >
              <dt className={`truncate font-mono text-[12px] ${topic === t ? "text-zinc-300" : "text-zinc-500"}`}>{t}</dt>
              <dd className={`mt-0.5 text-[18px] font-bold tabular-nums ${topic === t ? "text-white" : "text-zinc-950"}`}>
                {n} <span className={`text-[12px] font-medium ${bad > 0 ? "text-[#b3261e]" : topic === t ? "text-zinc-300" : "text-zinc-400"}`}>
                  {bad > 0 ? `· ${bad} failed` : "· healthy"}
                </span>
              </dd>
            </button>
          );
        })}
      </dl>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2.5 rounded-sm border border-zinc-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-center">
        <label className="relative block lg:w-72">
          <span className="sr-only">Search by order ID or correlation ID</span>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-zinc-400">⌕</span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID or correlation ID…"
            className="pl-9 font-mono text-[12.5px]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Dropdown
            label="Topic" ariaLabel="Filter by topic" allLabel="All topics"
            value={topic} onChange={(v) => { setTopic(v); setType(""); }}
            options={TOPICS.map((t) => ({ value: t, label: t }))}
          />
          <Dropdown
            label="Service" ariaLabel="Filter by service" allLabel="All services"
            value={service} onChange={setService}
            options={SERVICES.map((s) => ({ value: s, label: s }))}
          />
          <Dropdown
            label="Type" ariaLabel="Filter by event type" allLabel="All types"
            value={type} onChange={setType} options={typeOptions}
          />
          <Dropdown
            label="Status" ariaLabel="Filter by outcome" allLabel="All"
            value={outcome} onChange={setOutcome}
            options={[
              { value: "success", label: "Successful" },
              { value: "failed", label: "Failed" },
            ]}
          />
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex h-10 items-center rounded-sm px-3 text-[13px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
            >
              Clear all ({activeCount})
            </button>
          )}
        </div>
      </div>

      {/* Stream table */}
      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
          <p className="text-[12.5px] tabular-nums text-zinc-500" aria-live="polite">
            Showing {filtered.length} of {buffer.length} buffered events
            {failed > 0 && <span className="ml-2 font-semibold text-[#b3261e]">{failed} need attention</span>}
          </p>
          <p className="hidden font-mono text-[12px] text-zinc-400 sm:block">kafka · eu-west-2 · 6 partitions</p>
        </div>
        <Table className="min-w-[1020px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>Timestamp</TableHeadCell>
              <TableHeadCell>Topic</TableHeadCell>
              <TableHeadCell>Event type</TableHeadCell>
              <TableHeadCell>Order</TableHeadCell>
              <TableHeadCell>Service</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Correlation ID</TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-[13.5px] text-zinc-600">
                  Connecting to the event stream…
                </td>
              </tr>
            ) : loadError && buffer.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">Couldn&apos;t reach the API</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">{loadError}</p>
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.slice(0, 60).map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                  <TableCell className="whitespace-nowrap font-mono text-[12px] tabular-nums text-zinc-600">{e.timestamp}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[12px] text-zinc-600">{e.topic}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[12.5px] font-semibold text-zinc-950">{e.type}</TableCell>
                  <TableCell>
                    {e.order ? (
                      <Link
                        href={`/orders/${e.order}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="font-mono text-[12.5px] font-semibold text-zinc-950 hover:underline"
                      >
                        {e.order}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[12px] text-zinc-600">{e.service}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell className="max-w-[180px] truncate font-mono text-[12px] text-zinc-500" title={e.correlationId}>
                    {e.correlationId.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">No events match these filters</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">
                    Broaden the filters — the stream itself is healthy and still buffering in the background.
                  </p>
                  <button
                    onClick={clearAll}
                    className="mt-4 h-10 rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white hover:bg-zinc-800"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      <EventSheet event={selected} onClose={() => setSelected(null)} />
    </AdminShell>
  );
}
