import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { SERVICES, formatLag, getService } from "@/data/services";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ service: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ service: string }>;
}): Promise<Metadata> {
  const { service } = await params;
  const svc = getService(service);
  return { title: svc ? `${svc.name} | Services | Volt Ops` : "Service | Volt Ops" };
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
      <h2 className="border-b border-zinc-200 px-4 py-2.5 text-[13px] font-bold text-zinc-950 sm:px-5">{title}</h2>
      <div className="px-4 py-3.5 sm:px-5">{children}</div>
    </section>
  );
}

function HistoryBars({ values, unit, critAt }: { values: number[]; unit: string; critAt: number }) {
  const max = Math.max(...values);
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={`24h history, peak ${max}${unit}`}>
        {values.map((v, i) => (
          <div
            key={i}
            title={`${String(i).padStart(2, "0")}:00 — ${v}${unit}`}
            className={`flex-1 rounded-t-[2px] ${v >= critAt ? "bg-[#b3261e]" : "bg-zinc-950"}`}
            style={{ height: `${Math.max(6, Math.round((v / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-zinc-400">
        <span>24h ago</span><span>12h ago</span><span>now</span>
      </div>
    </div>
  );
}

function eventDot(tone: string) {
  if (tone === "ok") return "bg-green-700";
  if (tone === "warn") return "bg-amber-500";
  if (tone === "danger") return "bg-[#b3261e]";
  return "bg-zinc-300";
}

function kindBadge(kind: string) {
  if (kind === "alert") return <Badge variant="danger">alert</Badge>;
  if (kind === "deploy") return <Badge variant="success">deploy</Badge>;
  if (kind === "restart") return <Badge variant="warning">restart</Badge>;
  if (kind === "scale") return <Badge variant="outline">scale</Badge>;
  return <Badge variant="muted">config</Badge>;
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  const svc = getService(service);
  if (!svc) notFound();

  const metrics: [string, string][] = [
    ["CPU", `${svc.cpu}%`],
    ["Memory", `${svc.memory}%`],
    ["p50 latency", `${svc.latencyP50}ms`],
    ["p95 latency", `${svc.latencyP95}ms`],
    ["p99 latency", `${svc.latencyP99}ms`],
    ["Error rate (1h)", `${svc.errorRate.toFixed(2)}%`],
    ["Consumer lag", formatLag(svc.consumerLagSec)],
    ["Throughput", `${svc.requestsPerMin} req/min`],
  ];

  return (
    <AdminShell
      crumbs={[{ label: "Platform" }, { label: "Services", href: "/services" }, { label: svc.name }]}
      title={svc.name}
      actions={
        <Link
          href="/events"
          className="inline-flex h-9 items-center rounded-sm border border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-800 hover:border-zinc-950"
        >
          Open in event stream
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={svc.status === "Healthy" ? "success" : svc.status === "Degraded" ? "warning" : "danger"}>
          {svc.status}
        </Badge>
        <span className="font-mono text-[13px] font-semibold text-zinc-950">{svc.version}</span>
        <span className="text-[13px] text-zinc-500">
          {svc.description} · {svc.replicas}/{svc.desiredReplicas} replicas · uptime {svc.uptime}
        </span>
      </div>

      {/* Metric grid */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-200 bg-white md:grid-cols-4">
        {metrics.map(([label, value], i) => (
          <div
            key={label}
            className={`border-zinc-200 px-4 py-3 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-md:border-t" : ""} ${i % 4 !== 0 ? "md:border-l" : ""} ${i >= 4 ? "md:border-t" : ""}`}
          >
            <dt className="text-[12px] font-medium text-zinc-500">{label}</dt>
            <dd className="mt-0.5 text-[20px] font-bold tabular-nums tracking-tight text-zinc-950">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 font-mono text-[12px] text-zinc-500">
        kafka · group {svc.consumerGroup} · topic {svc.topic} · eu-west-2
      </p>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {/* History */}
          <Panel title="CPU and p95 latency — last 24 hours">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  CPU · now {svc.cpu}%
                </p>
                <HistoryBars values={svc.cpuHistory} unit="%" critAt={85} />
              </div>
              <div>
                <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  p95 latency · now {svc.latencyP95}ms
                </p>
                <HistoryBars values={svc.latencyHistory} unit="ms" critAt={300} />
              </div>
            </div>
          </Panel>

          {/* Endpoints */}
          <Panel title="Endpoints — p95 and error rate">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                    <th className="py-2 pr-3 font-semibold">Method</th>
                    <th className="py-2 pr-3 font-semibold">Path</th>
                    <th className="py-2 pr-3 font-semibold">p95</th>
                    <th className="py-2 font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {svc.endpoints.map((e) => (
                    <tr key={e.path}>
                      <td className="py-2 pr-3 font-mono text-[12px] font-bold text-zinc-950">{e.method}</td>
                      <td className="py-2 pr-3 font-mono text-[12.5px] text-zinc-800">{e.path}</td>
                      <td className={`py-2 pr-3 tabular-nums ${e.p95 > 300 ? "font-bold text-[#b3261e]" : ""}`}>{e.p95}ms</td>
                      <td className={`py-2 tabular-nums ${e.errorRate >= 1 ? "font-bold text-[#b3261e]" : "text-zinc-600"}`}>
                        {e.errorRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Replicas */}
          <Panel title={`Replicas — ${svc.replicas}/${svc.desiredReplicas} active`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                    <th className="py-2 pr-3 font-semibold">Pod</th>
                    <th className="py-2 pr-3 font-semibold">Node</th>
                    <th className="py-2 pr-3 font-semibold">CPU</th>
                    <th className="py-2 pr-3 font-semibold">Mem</th>
                    <th className="py-2 pr-3 font-semibold">Uptime</th>
                    <th className="py-2 font-semibold">Restarts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {svc.replicaList.map((r) => (
                    <tr key={r.name}>
                      <td className="py-2 pr-3 font-mono text-[12px] font-semibold text-zinc-950">{r.name}</td>
                      <td className="py-2 pr-3 font-mono text-[12px] text-zinc-600">{r.node}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.cpu}%</td>
                      <td className="py-2 pr-3 tabular-nums">{r.memory}%</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-zinc-600">{r.uptime}</td>
                      <td className={`py-2 tabular-nums ${r.restarts > 1 ? "font-bold text-[#b3261e]" : r.restarts === 1 ? "font-semibold text-amber-800" : "text-zinc-600"}`}>
                        {r.restarts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {svc.replicas < svc.desiredReplicas && (
              <p className="mt-3 rounded-sm border border-[#b3261e]/20 bg-[#b3261e]/5 px-3 py-2 text-[12.5px] font-medium text-[#b3261e]">
                Below desired replicas ({svc.replicas}/{svc.desiredReplicas}) — replacement pod pending. Check node capacity in eu-west-2c.
              </p>
            )}
          </Panel>

          {/* Recent events */}
          <Panel title="Recent events">
            <ul className="divide-y divide-zinc-100">
              {svc.events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventDot(e.tone)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {kindBadge(e.kind)}
                      <span className="text-[13px] text-zinc-800">{e.text}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-[11.5px] text-zinc-400">{e.at}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Runtime">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Version</dt><dd className="font-mono font-semibold">{svc.version}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Status</dt><dd><Badge variant={svc.status === "Healthy" ? "success" : "warning"}>{svc.status}</Badge></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Uptime (90d)</dt><dd className="font-medium tabular-nums">{svc.uptime}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Replicas</dt><dd className="font-bold tabular-nums">{svc.replicas}/{svc.desiredReplicas}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Throughput</dt><dd className="tabular-nums">{svc.requestsPerMin} req/min</dd></div>
            </dl>
          </Panel>

          <Panel title="Kafka consumer">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Group</dt><dd className="truncate font-mono text-[12.5px] font-semibold">{svc.consumerGroup}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Topic</dt><dd className="font-mono text-[12.5px]">{svc.topic}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Lag</dt><dd className="font-bold tabular-nums">{formatLag(svc.consumerLagSec)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Partitions</dt><dd className="tabular-nums">6 · 1 lagging</dd></div>
            </dl>
            <Link href="/events" className="mt-3 block text-[12.5px] font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600">
              Inspect topic in event stream →
            </Link>
          </Panel>

          <Panel title="Other services">
            <ul className="space-y-2">
              {SERVICES.filter((o) => o.slug !== svc.slug).map((o) => (
                <li key={o.slug}>
                  <Link href={`/services/${o.slug}`} className="flex items-center justify-between gap-2 text-[13px] hover:underline">
                    <span className="font-medium text-zinc-950">{o.name}</span>
                    <Badge variant={o.status === "Healthy" ? "success" : "warning"}>{o.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/services" className="text-[13px] font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
          ← Back to all services
        </Link>
      </div>
    </AdminShell>
  );
}
