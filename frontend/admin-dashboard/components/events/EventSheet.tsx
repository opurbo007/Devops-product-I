"use client";

import { useState } from "react";
import Link from "next/link";
import { Sheet, SheetHeader } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { StreamEvent } from "@/lib/events";

function statusBadge(s: StreamEvent["status"]) {
  if (s === "Delivered") return <Badge variant="success">Delivered</Badge>;
  if (s === "Retrying") return <Badge variant="warning">Retrying</Badge>;
  return <Badge variant="danger">Dead-letter</Badge>;
}

function CopyId({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-zinc-500">{label}</p>
        <p className="truncate font-mono text-[12.5px] text-zinc-950" title={value}>{value}</p>
      </div>
      <button
        onClick={copy}
        className="h-8 shrink-0 rounded-sm border border-zinc-300 px-2.5 text-[12px] font-semibold hover:border-zinc-950"
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}

function ReplayButton({ event }: { event: StreamEvent }) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  if (event.status === "Delivered") return null;
  if (state === "done") {
    return (
      <p className="rounded-sm bg-green-50 px-3.5 py-2.5 text-[13px] font-semibold text-green-800" aria-live="polite">
        ✓ Replay accepted — event re-queued to {event.topic} (attempt {event.attempts + 1}).
      </p>
    );
  }
  return (
    <button
      onClick={() => {
        setState("working");
        setTimeout(() => setState("done"), 1100);
      }}
      disabled={state === "working"}
      className="inline-flex h-10 items-center gap-2 rounded-sm bg-zinc-950 px-4 text-[13.5px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
    >
      {state === "working" && (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {state === "working" ? "Replaying…" : event.status === "Dead-letter" ? "Replay from dead-letter" : "Force retry now"}
    </button>
  );
}

export default function EventSheet({ event, onClose }: { event: StreamEvent | null; onClose: () => void }) {
  return (
    <Sheet open={event !== null} onClose={onClose} label={event ? `Event ${event.type}` : "Event details"}>
      {event && (
        <>
          <SheetHeader
            title={event.type}
            sub={`${event.topic} · partition ${event.partition} · offset ${event.offset.toLocaleString("en-GB")}`}
            onClose={onClose}
          />
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(event.status)}
              <span className="text-[12.5px] tabular-nums text-zinc-500">
                attempt {event.attempts} · consumer lag {(event.lagMs / 1000).toFixed(1)}s · {event.timestamp}
              </span>
            </div>

            {/* Payload */}
            <section aria-label="Event payload">
              <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Payload</h3>
              <pre className="overflow-x-auto rounded-sm border border-zinc-200 bg-zinc-950 p-3.5 font-mono text-[12px] leading-relaxed text-zinc-100">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </section>

            {/* Identity */}
            <section aria-label="Tracing identifiers" className="space-y-3 rounded-sm border border-zinc-200 p-3.5">
              <CopyId value={event.correlationId} label="Correlation ID" />
              <div className="h-px bg-zinc-100" aria-hidden="true" />
              <CopyId value={event.causationId} label="Causation ID" />
              <p className="text-[12px] leading-relaxed text-zinc-500">
                {event.correlationId === event.causationId
                  ? "This event started the trace — correlation and causation IDs match."
                  : "Follow the causation ID to the parent event that triggered this one."}{" "}
                {event.order && (
                  <>Order context: <Link href={`/orders/${event.order}`} className="font-semibold text-zinc-950 underline underline-offset-2">{event.order}</Link></>
                )}
              </p>
            </section>

            {/* Broker metadata */}
            <section aria-label="Broker metadata">
              <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Broker metadata</h3>
              <dl className="divide-y divide-zinc-100 rounded-sm border border-zinc-200 text-[13px]">
                {[
                  ["Topic", event.topic],
                  ["Partition", String(event.partition)],
                  ["Offset", event.offset.toLocaleString("en-GB")],
                  ["Key", event.order ?? "(null — broadcast)"],
                  ["Producer", `${event.service} · v2.14.3`],
                  ["Consumer group", `${event.topic.split(".")[0]}-sync`],
                  ["Schema", `${event.type} v3 · compatible`],
                  ["Timestamp", `${event.timestamp} Europe/London`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 px-3.5 py-2">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="truncate font-mono text-[12.5px] text-zinc-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <ReplayButton event={event} />
          </div>
        </>
      )}
    </Sheet>
  );
}
