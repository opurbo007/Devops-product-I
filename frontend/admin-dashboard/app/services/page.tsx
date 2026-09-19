"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SERVICES, formatLag, type ServiceHealth, type ServiceStatus } from "@/data/services";
import { fetchServiceHealth, type HealthState } from "@/lib/api";
import { toServiceHealth } from "@/lib/backend";
import { useRequireAdmin } from "@/lib/auth";

// Gateway path segment per mock slug.
const HEALTH_SLUG: Record<string, HealthState["slug"]> = {
  order: "orders",
  inventory: "inventory",
  payment: "payments",
  shipping: "shipping",
  cart: "cart",
  "notification-service": "notifications",
};

function statusBadge(s: ServiceStatus) {
  if (s === "Healthy") return <Badge variant="success">Healthy</Badge>;
  if (s === "Degraded") return <Badge variant="warning">Degraded</Badge>;
  return <Badge variant="danger">Down</Badge>;
}

function bar(value: number, warnAt = 70, critAt = 85) {
  const tone = value >= critAt ? "bg-[#b3261e]" : value >= warnAt ? "bg-amber-500" : "bg-zinc-950";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      <span className="tabular-nums">{value}%</span>
    </span>
  );
}

export default function ServicesPage() {
  useRequireAdmin();
  const [live, setLive] = useState<Record<string, HealthState>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(
      SERVICES.map((s) =>
        fetchServiceHealth(HEALTH_SLUG[s.slug] ?? "orders").then((h) => ({ slug: s.slug, h })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, HealthState> = {};
      for (const r of results) {
        if (r.status === "fulfilled") next[r.value.slug] = r.value.h;
      }
      setLive(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live status + measured latency overlaid on the fleet rows.
  const rows: ServiceHealth[] = SERVICES.map(
    (s) => toServiceHealth(HEALTH_SLUG[s.slug] ?? s.slug, live[s.slug] ?? null) ?? s,
  );

  const healthy = rows.filter((s) => s.status === "Healthy").length;
  const degraded = rows.filter((s) => s.status === "Degraded").length;
  const down = rows.filter((s) => s.status === "Down").length;
  const totalReplicas = rows.reduce((n, s) => n + s.replicas, 0);
  const worstLag = Math.max(...rows.map((s) => s.consumerLagSec));
  const worstLagSvc = rows.find((s) => s.consumerLagSec === worstLag);
  const worstErr = Math.max(...rows.map((s) => s.errorRate));
  const worstErrSvc = rows.find((s) => s.errorRate === worstErr);

  return (
    <AdminShell
      crumbs={[{ label: "Platform" }, { label: "Services" }]}
      title="Services"
      actions={
        <span className="text-[13px] tabular-nums text-zinc-500" aria-live="polite">
          {healthy} healthy · {degraded} degraded · {down} down · {totalReplicas} replicas
        </span>
      }
    >
      {/* Summary strip */}
      <dl className="mb-4 grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white md:grid-cols-4">
        {[
          { label: "Fleet status", value: `${healthy}/6 healthy`, note: degraded > 0 ? `${degraded} degraded` : down > 0 ? `${down} down` : "all nominal" },
          { label: "Worst consumer lag", value: formatLag(worstLag), note: `${worstLagSvc?.consumerGroup} · ${worstLagSvc?.name}` },
          { label: "Highest error rate", value: `${worstErr.toFixed(2)}%`, note: `${worstErrSvc?.name} · 1h window` },
          { label: "Active replicas", value: String(totalReplicas), note: "across eu-west-2a/b/c" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`border-zinc-200 px-4 py-3.5 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-md:border-t" : ""} ${i > 0 ? "md:border-l" : ""}`}
          >
            <dt className="text-[12px] font-medium text-zinc-500">{s.label}</dt>
            <dd className="mt-0.5 text-[20px] font-bold tabular-nums tracking-tight text-zinc-950">{s.value}</dd>
            <dd className="mt-0.5 truncate text-[12px] text-zinc-500" title={s.note}>{s.note}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 sm:px-5">
          <p className="text-[12.5px] text-zinc-500">
            Status is live from each service /health · telemetry rows are demo data
          </p>
          <p className="hidden font-mono text-[12px] text-zinc-400 sm:block">prometheus · kafka · k8s</p>
        </div>
        <Table className="min-w-[1060px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>Service</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>CPU</TableHeadCell>
              <TableHeadCell>Memory</TableHeadCell>
              <TableHeadCell>p95 latency</TableHeadCell>
              <TableHeadCell>Error rate</TableHeadCell>
              <TableHeadCell>Consumer lag</TableHeadCell>
              <TableHeadCell>Replicas</TableHeadCell>
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.slug}>
                <TableCell>
                  <Link href={`/services/${s.slug}`} className="block font-medium text-zinc-950 hover:underline">
                    {s.name}
                  </Link>
                  <span className="block font-mono text-[12px] text-zinc-500">{s.version} · {s.requestsPerMin} req/min</span>
                </TableCell>
                <TableCell>{statusBadge(s.status)}</TableCell>
                <TableCell className="tabular-nums text-zinc-800">{bar(s.cpu)}</TableCell>
                <TableCell className="tabular-nums text-zinc-800">{bar(s.memory)}</TableCell>
                <TableCell className={`tabular-nums ${s.latencyP95 > 300 ? "font-bold text-[#b3261e]" : s.latencyP95 > 200 ? "font-semibold text-amber-800" : ""}`}>
                  {s.latencyP95}ms
                </TableCell>
                <TableCell className={`tabular-nums ${s.errorRate >= 1 ? "font-bold text-[#b3261e]" : s.errorRate >= 0.2 ? "font-semibold text-amber-800" : "text-zinc-700"}`}>
                  {s.errorRate.toFixed(2)}%
                </TableCell>
                <TableCell className={`tabular-nums ${s.consumerLagSec >= 10 ? "font-bold text-[#b3261e]" : s.consumerLagSec >= 2 ? "font-semibold text-amber-800" : "text-zinc-700"}`}>
                  {formatLag(s.consumerLagSec)}
                </TableCell>
                <TableCell className={`tabular-nums ${s.replicas < s.desiredReplicas ? "font-bold text-[#b3261e]" : ""}`}>
                  {s.replicas}/{s.desiredReplicas}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/services/${s.slug}`}
                    className="rounded-sm border border-zinc-300 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-800 hover:border-zinc-950 hover:text-zinc-950"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 text-[12.5px] text-zinc-500">
        Thresholds: CPU warn ≥70% / crit ≥85% · p95 warn &gt;200ms / crit &gt;300ms · error warn ≥0.20% / crit ≥1.00% · lag warn ≥2s / crit ≥10s · replicas crit when below desired.
      </p>
    </AdminShell>
  );
}
