"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog } from "@/components/ui/dialog";
import EventSheet from "@/components/events/EventSheet";
import { TOPICS, SERVICES, type StreamEvent } from "@/lib/events";
import { FAILURE_TYPES, ageLabel, type DlqEntry } from "@/lib/dlq";
import {
  ApiError,
  apiPeekDlq,
  apiReplayDlq,
  type DlqService,
} from "@/lib/api";
import { toDlqEntry } from "@/lib/backend";
import { useRequireAdmin } from "@/lib/auth";

function shortId(e: StreamEvent): string {
  if (e.offset > 0) return `EV-${e.offset.toString(36).toUpperCase()}`;
  return `EV-${e.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function dlqBadge(s: DlqEntry["dlqStatus"]) {
  if (s === "Open") return <Badge variant="danger">Open</Badge>;
  if (s === "Replaying") return <Badge variant="warning">Replaying</Badge>;
  return <Badge variant="success">Resolved</Badge>;
}

function ResolveDialog({
  entry,
  onClose,
  onResolve,
}: {
  entry: DlqEntry | null;
  onClose: () => void;
  onResolve: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!entry) return null;

  const confirm = () => {
    if (note.trim().length < 8) {
      setError("Add a short note (min 8 characters) — the audit log requires it.");
      return;
    }
    onResolve(note.trim());
    setNote("");
    setError(null);
  };

  return (
    <Dialog open={entry !== null} onClose={onClose} title={`Mark resolved — ${shortId(entry)}`}>
      <p className="font-mono text-[12.5px] text-zinc-950">{entry.type}</p>
      <p className="mt-0.5 truncate text-[12.5px] text-zinc-500">{entry.error}</p>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-zinc-900">Resolution note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Duplicate of applied projection — safely discarded."
          className="w-full rounded-sm border border-zinc-300 p-2.5 text-[13px] placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
        />
      </label>
      {error && <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-[#b3261e]">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 rounded-sm border border-zinc-300 px-4 text-[13.5px] font-semibold hover:border-zinc-950">
          Cancel
        </button>
        <button onClick={confirm} className="h-10 rounded-sm bg-zinc-950 px-4 text-[13.5px] font-semibold text-white hover:bg-zinc-800">
          Mark resolved
        </button>
      </div>
    </Dialog>
  );
}

const DLQ_SERVICES: DlqService[] = [
  "orders",
  "inventory",
  "shipping",
  "payments",
  "notifications",
];

export default function DlqPage() {
  useRequireAdmin();
  const [entries, setEntries] = useState<DlqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  // Replay needs (service, dlqTopic) per entry — not part of the UI type.
  const meta = useRef(new Map<string, { service: DlqService; dlqTopic: string }>());
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [service, setService] = useState("");
  const [failure, setFailure] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<DlqEntry | null>(null);
  const [resolving, setResolving] = useState<DlqEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled(
          DLQ_SERVICES.map((s) => apiPeekDlq(s)),
        );
        if (cancelled) return;
        const all: DlqEntry[] = [];
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return;
          for (const m of r.value) {
            const entry = toDlqEntry(m);
            meta.current.set(entry.id, {
              service: DLQ_SERVICES[i] as DlqService,
              dlqTopic: m.dlqTopic,
            });
            all.push(entry);
          }
        });
        all.sort((a, b) => b.epoch - a.epoch);
        setEntries(all);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : "Could not load the DLQ.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (id: string, p: Partial<DlqEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const replay = async (entry: DlqEntry) => {
    const m = meta.current.get(entry.id);
    if (!m) return;
    patch(entry.id, { dlqStatus: "Replaying" });
    setReplayError(null);
    try {
      const { replayed } = await apiReplayDlq(m.service, entry.topic.endsWith(".DLQ") ? entry.topic : m.dlqTopic);
      patch(entry.id, {
        dlqStatus: "Resolved",
        status: "Delivered",
        attempts: entry.attempts + 1,
        resolvedAt: new Date().toISOString().slice(11, 19),
        resolvedBy: "Ops console (you)",
        resolveNote: `Replayed manually — ${replayed} message(s) requeued.`,
      });
    } catch (e) {
      patch(entry.id, { dlqStatus: "Open" });
      setReplayError(e instanceof ApiError ? e.message : "Replay failed.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (q && ![e.order ?? "", e.correlationId, e.type, shortId(e)].some((f) => f.toLowerCase().includes(q))) return false;
      if (topic && e.topic !== topic) return false;
      if (service && e.service !== service) return false;
      if (failure && e.failureType !== failure) return false;
      if (status && e.dlqStatus !== status) return false;
      return true;
    });
  }, [entries, query, topic, service, failure, status]);

  const open = useMemo(() => entries.filter((e) => e.dlqStatus === "Open"), [entries]);
  const resolved = useMemo(
    () => entries.filter((e) => e.dlqStatus === "Resolved"),
    [entries],
  );
  const oldest = open.reduce((m, e) => Math.max(m, e.ageMin), 0);
  const worstTopic = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of open) counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1);
    let top: [string, number] = ["—", 0];
    for (const kv of counts) if (kv[1] > top[1]) top = kv;
    return top;
  }, [open]);

  const activeCount = (topic ? 1 : 0) + (service ? 1 : 0) + (failure ? 1 : 0) + (status ? 1 : 0) + (query.trim() ? 1 : 0);
  const clearAll = () => {
    setQuery("");
    setTopic("");
    setService("");
    setFailure("");
    setStatus("");
  };

  return (
    <AdminShell
      crumbs={[{ label: "Platform" }, { label: "Events", href: "/events" }, { label: "Dead-letter queue" }]}
      title="Dead-letter queue"
      actions={
        <Link
          href="/events"
          className="inline-flex h-9 items-center rounded-sm border border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-800 hover:border-zinc-950"
        >
          ← Event stream
        </Link>
      }
    >
      {/* Risk strip */}
      <dl className="mb-4 grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white lg:grid-cols-4">
        {[
          ["Open failures", String(open.length), open.length > 5 ? "text-[#b3261e]" : "text-zinc-950"],
          ["Oldest open", open.length ? ageLabel(oldest) : "—", oldest > 120 ? "text-[#b3261e]" : "text-zinc-950"],
          [`Worst topic · ${worstTopic[0]}`, String(worstTopic[1]), "text-zinc-950"],
          ["Resolved (24h)", String(resolved.length), "text-green-800"],
        ].map(([label, value, cls], i) => (
          <div key={label} className={`px-4 py-3.5 sm:px-5 ${i % 2 === 1 ? "border-l border-zinc-200" : ""} ${i >= 2 ? "max-lg:border-t lg:border-l" : ""}`}>
            <dt className="truncate text-[12px] font-medium text-zinc-500">{label}</dt>
            <dd className={`mt-0.5 text-[22px] font-bold tabular-nums tracking-tight ${cls}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {oldest > 120 && open.length > 0 && (
        <p role="alert" className="mb-4 rounded-sm border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-zinc-800">
          <strong className="font-bold">Operational risk:</strong> the oldest open failure is {ageLabel(oldest)} old.
          Every open DLQ entry is an order, payment or stock movement that never completed — work oldest-first.
        </p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2.5 rounded-sm border border-zinc-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-center">
        <label className="relative block lg:w-72">
          <span className="sr-only">Search dead-letter queue</span>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-zinc-400">⌕</span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order, event ID, correlation…"
            className="pl-9 font-mono text-[12.5px]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Dropdown label="Topic" ariaLabel="Filter by topic" allLabel="All topics"
            value={topic} onChange={setTopic} options={TOPICS.map((t) => ({ value: t, label: t }))} />
          <Dropdown label="Service" ariaLabel="Filter by consumer service" allLabel="All services"
            value={service} onChange={setService} options={SERVICES.map((s) => ({ value: s, label: s }))} />
          <Dropdown label="Failure" ariaLabel="Filter by failure type" allLabel="All types"
            value={failure} onChange={setFailure} options={FAILURE_TYPES.map((f) => ({ value: f, label: f }))} />
          <Dropdown label="Status" ariaLabel="Filter by DLQ status" allLabel="All"
            value={status} onChange={setStatus}
            options={[{ value: "Open", label: "Open" }, { value: "Replaying", label: "Replaying" }, { value: "Resolved", label: "Resolved" }]} />
          {activeCount > 0 && (
            <button onClick={clearAll} className="flex h-10 items-center rounded-sm px-3 text-[13px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-950">
              Clear all ({activeCount})
            </button>
          )}
        </div>
      </div>

      {replayError && (
        <p role="alert" className="mb-4 rounded-sm border border-[#b3261e] bg-red-50 px-4 py-2.5 text-[13px] text-[#8f1d17]">
          Replay failed: {replayError}
        </p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <Table className="min-w-[1180px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>Topic</TableHeadCell>
              <TableHeadCell>Event ID</TableHeadCell>
              <TableHeadCell>Order</TableHeadCell>
              <TableHeadCell>Consumer</TableHeadCell>
              <TableHeadCell>Failure type</TableHeadCell>
              <TableHeadCell>Error</TableHeadCell>
              <TableHeadCell>Retries</TableHeadCell>
              <TableHeadCell>Failed at</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-5 py-14 text-center text-[13.5px] text-zinc-600">
                  Loading dead-letter queue…
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={10} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">Couldn&apos;t reach the API</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">{loadError}</p>
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((e) => {
                const done = e.dlqStatus === "Resolved";
                return (
                  <TableRow key={e.id} className={done ? "bg-zinc-50" : ""}>
                    <TableCell className={`whitespace-nowrap font-mono text-[12px] ${done ? "text-zinc-400" : "text-zinc-600"}`}>{e.topic}</TableCell>
                    <TableCell className={`whitespace-nowrap font-mono text-[12.5px] font-semibold ${done ? "text-zinc-500" : "text-zinc-950"}`}>{shortId(e)}</TableCell>
                    <TableCell>
                      {e.order ? (
                        <Link href={`/orders/${e.orderBackendId ?? e.order}`} className={`font-mono text-[12.5px] font-semibold hover:underline ${done ? "text-zinc-500" : "text-zinc-950"}`}>
                          {e.order}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className={`whitespace-nowrap font-mono text-[12px] ${done ? "text-zinc-400" : "text-zinc-600"}`}>{e.service}</TableCell>
                    <TableCell className={`whitespace-nowrap text-[12.5px] font-medium ${done ? "text-zinc-400" : "text-zinc-800"}`}>{e.failureType}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className={`truncate font-mono text-[12px] ${done ? "text-zinc-400" : "text-zinc-700"}`} title={e.error}>{e.error}</p>
                      {done && e.resolvedBy && (
                        <p className="mt-0.5 truncate text-[11.5px] text-zinc-400">
                          ✓ {e.resolvedBy}{e.resolvedAt ? ` · ${e.resolvedAt}` : ""}{e.resolveNote ? ` — ${e.resolveNote}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className={`tabular-nums ${done ? "text-zinc-400" : ""}`}>{e.attempts}</TableCell>
                    <TableCell className={`whitespace-nowrap tabular-nums ${done ? "text-zinc-400" : "text-zinc-600"}`}>
                      {e.firstFailedAt} <span className="text-zinc-400">({ageLabel(e.ageMin)})</span>
                    </TableCell>
                    <TableCell>{dlqBadge(e.dlqStatus)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelected(e)}
                          className="rounded-sm border border-zinc-300 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-800 hover:border-zinc-950 hover:text-zinc-950"
                        >
                          View
                        </button>
                        {!done && (
                          <>
                            <button
                              onClick={() => e.dlqStatus === "Open" && replay(e)}
                              disabled={e.dlqStatus !== "Open"}
                              className="rounded-sm border border-zinc-950 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-950 hover:bg-zinc-950 hover:text-white disabled:cursor-wait disabled:opacity-50"
                            >
                              {e.dlqStatus === "Replaying" ? "…" : "Replay"}
                            </button>
                            <button
                              onClick={() => e.dlqStatus === "Open" && setResolving(e)}
                              disabled={e.dlqStatus !== "Open"}
                              className="rounded-sm px-2.5 py-1 text-[12.5px] font-semibold text-zinc-500 hover:text-zinc-950 hover:underline disabled:opacity-40"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">
                    {entries.length === 0 ? "Dead-letter queue is empty" : "No failures match these filters"}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">
                    {entries.length === 0
                      ? "Every failed event has been replayed or resolved. This is the correct state."
                      : "Broaden the filters to see the full queue."}
                  </p>
                  {entries.length > 0 && (
                    <button onClick={clearAll} className="mt-4 h-10 rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white hover:bg-zinc-800">
                      Clear all filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      <EventSheet event={selected} onClose={() => setSelected(null)} />
      <ResolveDialog
        entry={resolving}
        onClose={() => setResolving(null)}
        onResolve={(note) => {
          if (!resolving) return;
          patch(resolving.id, {
            dlqStatus: "Resolved",
            resolvedAt: new Date().toISOString().slice(11, 19),
            resolvedBy: "Amara O. (you)",
            resolveNote: note,
          });
          setResolving(null);
        }}
      />
    </AdminShell>
  );
}
