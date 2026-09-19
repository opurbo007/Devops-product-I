"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  apiCreateOrder,
  apiGetChaos,
  apiGetCircuit,
  apiGetOrder,
  apiSetChaos,
  CHAOS_FLAGS,
  fetchServiceHealth,
  type CircuitStats,
  type DlqService,
  type HealthState,
} from "@/lib/api";
import { useAuth, useRequireAdmin } from "@/lib/auth";

type FleetSlug = HealthState["slug"];

const FLEET: { slug: FleetSlug; name: string; port: string }[] = [
  { slug: "gateway", name: "API gateway", port: ":8080" },
  { slug: "orders", name: "Order service", port: ":3000" },
  { slug: "inventory", name: "Inventory", port: ":3001" },
  { slug: "shipping", name: "Shipping", port: ":3002" },
  { slug: "payments", name: "Payment", port: ":3003" },
  { slug: "notifications", name: "Notifications", port: ":3004" },
  { slug: "cart", name: "Cart", port: ":3005" },
];

interface Scenario {
  id: string;
  title: string;
  blurb: string;
  apply: { service: DlqService; flag: string; value: string }[];
  watch: { label: string; href: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "payment-outage",
    title: "Payment outage",
    blurb: "Every charge is declined. Orders fail fast and reserved stock is compensated — no DLQ, this is the designed path.",
    apply: [{ service: "payments", flag: "PAYMENT_DECLINE_CODE", value: "card_declined" }],
    watch: [
      { label: "Failed orders", href: "/orders" },
      { label: "Breaker state", href: "#breakers" },
    ],
  },
  {
    id: "slow-provider",
    title: "Slow payment provider",
    blurb: "Charges take 8s against a 2s circuit timeout. Timeouts trip the breaker open — watch it fail fast afterwards.",
    apply: [{ service: "payments", flag: "PAYMENT_LATENCY_MS", value: "8000" }],
    watch: [
      { label: "Breaker state", href: "#breakers" },
      { label: "Failed payments", href: "/payments" },
    ],
  },
  {
    id: "inventory-outage",
    title: "Inventory outage",
    blurb: "Reservations throw before any DB write. Messages land in order.created.DLQ and orders sit pending until you replay.",
    apply: [{ service: "inventory", flag: "INVENTORY_FAIL_RESERVE", value: "1" }],
    watch: [
      { label: "Dead letters", href: "/events/dlq" },
      { label: "Pending orders", href: "/orders" },
    ],
  },
  {
    id: "shipping-blackout",
    title: "Shipping blackout",
    blurb: "Paid orders never dispatch. payment.completed.DLQ grows — replay it after reset to drain the backlog.",
    apply: [{ service: "shipping", flag: "SHIPPING_FAIL_DISPATCH", value: "1" }],
    watch: [
      { label: "Dead letters", href: "/events/dlq" },
      { label: "Shipments", href: "/shipments" },
    ],
  },
  {
    id: "notification-blackout",
    title: "Notification blackout",
    blurb: "Sends fail and the breaker opens — but notifications are still recorded. The consumer degrades instead of losing data.",
    apply: [{ service: "notifications", flag: "NOTIFICATION_FAIL", value: "1" }],
    watch: [
      { label: "Breaker state", href: "#breakers" },
      { label: "Event stream", href: "/events" },
    ],
  },
  {
    id: "saga-outage",
    title: "Saga tracker outage",
    blurb: "The orchestrator stops tracking. Downstream services keep working but order statuses freeze — then catch up on replay.",
    apply: [{ service: "orders", flag: "ORDER_FAIL_SAGA", value: "1" }],
    watch: [
      { label: "Dead letters", href: "/events/dlq" },
      { label: "Orders", href: "/orders" },
    ],
  },
];

const ALL_FLAGS: { service: DlqService; flag: string }[] = (
  Object.entries(CHAOS_FLAGS) as [DlqService, { flag: string; label: string }[]][]
).flatMap(([service, defs]) => defs.map((d) => ({ service, flag: d.flag })));

const JOURNEY_SKU = "VL-APP-APPLMBA13M";
const JOURNEY_STAGES = ["pending", "reserved", "paid", "shipped"] as const;

function Section({
  id,
  title,
  blurb,
  children,
}: {
  id?: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="overflow-hidden rounded-sm border border-zinc-200 bg-white scroll-mt-4">
      <div className="border-b border-zinc-200 px-4 py-2.5 sm:px-5">
        <h2 className="text-[13.5px] font-bold text-zinc-950">{title}</h2>
        {blurb && <p className="mt-0.5 text-[12.5px] text-zinc-600">{blurb}</p>}
      </div>
      <div className="px-4 py-3.5 sm:px-5">{children}</div>
    </section>
  );
}

function FleetGrid({ fleet }: { fleet: Record<string, HealthState> }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
      {FLEET.map((s) => {
        const h = fleet[s.slug];
        const ok = h?.ok;
        return (
          <div
            key={s.slug}
            className={`rounded-sm border px-3 py-2.5 ${ok === false ? "border-[#b3261e]/40 bg-red-50" : "border-zinc-200"}`}
          >
            <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-zinc-950">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${ok === undefined ? "animate-pulse bg-zinc-300" : ok ? "bg-green-700" : "bg-[#b3261e]"}`}
              />
              {s.name}
            </p>
            <p className="mt-0.5 font-mono text-[11.5px] text-zinc-500">
              {s.port} · {h?.latencyMs != null ? `${h.latencyMs}ms` : ok === false ? "down" : "…"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function BreakerCard({
  title,
  service,
  tick,
}: {
  title: string;
  service: "payments" | "notifications";
  tick: number;
}) {
  const [stats, setStats] = useState<(CircuitStats & { provider?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetCircuit(service)
      .then((r) => {
        if (!cancelled) {
          setStats({ ...r.circuit, ...(r.provider ? { provider: r.provider } : {}) });
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, [service, tick]);

  const tone =
    stats == null || error
      ? "muted"
      : stats.state === "closed"
        ? "success"
        : stats.state === "open"
          ? "danger"
          : "warning";

  return (
    <div className="rounded-sm border border-zinc-200 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-zinc-950">{title}</p>
        <Badge variant={tone as "success" | "danger" | "warning" | "muted"}>
          {error ? "unreachable" : (stats?.state ?? "…")}
        </Badge>
      </div>
      {stats && !error && (
        <dl className="mt-2 space-y-1 text-[12.5px]">
          <div className="flex justify-between gap-2"><dt className="text-zinc-500">Failures</dt><dd className="font-semibold tabular-nums">{stats.failures}/{stats.failureThreshold}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-zinc-500">Timeout</dt><dd className="tabular-nums">{stats.timeoutMs}ms</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-zinc-500">Reset</dt><dd className="tabular-nums">{stats.resetMs}ms</dd></div>
          {stats.provider && (
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">Provider</dt><dd className="font-mono font-semibold">{stats.provider}</dd></div>
          )}
          {stats.openedAt && (
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">Opened</dt><dd className="tabular-nums">{new Date(stats.openedAt).toLocaleTimeString("en-GB")}</dd></div>
          )}
        </dl>
      )}
    </div>
  );
}

export default function ChaosLabPage() {
  const { user } = useAuth();
  useRequireAdmin();
  const [fleet, setFleet] = useState<Record<string, HealthState>>({});
  const [tick, setTick] = useState(0);
  const [activeFlags, setActiveFlags] = useState<Record<string, string>>({});
  const [busyScenario, setBusyScenario] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Journey timer state
  const [journey, setJourney] = useState<{
    orderId: string;
    stages: { status: string; atMs: number }[];
    done: boolean;
    error?: string;
  } | null>(null);
  const [journeyBusy, setJourneyBusy] = useState(false);

  // Load burst state
  const [burstN, setBurstN] = useState("20");
  const [burst, setBurst] = useState<null | {
    ok: number;
    failed: number;
    p50: number;
    p95: number;
    max: number;
    wallMs: number;
  }>(null);
  const [burstBusy, setBurstBusy] = useState(false);
  const burstAbort = useRef(false);

  const refreshFlags = useCallback(async () => {
    const out: Record<string, string> = {};
    const results = await Promise.allSettled(
      (Object.keys(CHAOS_FLAGS) as DlqService[]).map((s) => apiGetChaos(s)),
    );
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      const service = Object.keys(CHAOS_FLAGS)[i] as DlqService;
      for (const [k, v] of Object.entries(r.value.flags)) out[`${service}:${k}`] = v;
    });
    setActiveFlags(out);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pollFleet = async () => {
      const results = await Promise.allSettled(
        FLEET.map((s) => fetchServiceHealth(s.slug)),
      );
      if (cancelled) return;
      const next: Record<string, HealthState> = {};
      for (const r of results) {
        if (r.status === "fulfilled") next[r.value.slug] = r.value;
      }
      setFleet(next);
    };
    void pollFleet();
    // Mount-time load of chaos flags (async boundaries below; not a render cascade).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFlags();
    const t = setInterval(() => {
      void pollFleet();
      setTick((x) => x + 1);
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refreshFlags]);

  const applyScenario = async (sc: Scenario) => {
    setBusyScenario(sc.id);
    setScenarioError(null);
    try {
      await Promise.all(sc.apply.map((a) => apiSetChaos(a.service, a.flag, a.value)));
      await refreshFlags();
    } catch (e) {
      setScenarioError(e instanceof ApiError ? e.message : "Scenario failed.");
    } finally {
      setBusyScenario(null);
    }
  };

  const resetAll = async () => {
    setBusyScenario("reset");
    setScenarioError(null);
    try {
      await Promise.all(ALL_FLAGS.map((f) => apiSetChaos(f.service, f.flag, "")));
      await refreshFlags();
    } catch (e) {
      setScenarioError(e instanceof ApiError ? e.message : "Reset failed.");
    } finally {
      setBusyScenario(null);
    }
  };

  const runJourney = async () => {
    if (!user || journeyBusy) return;
    setJourneyBusy(true);
    setJourney(null);
    try {
      const t0 = performance.now();
      const created = await apiCreateOrder({
        customerId: user.id,
        total: 1049,
        items: [{ sku: JOURNEY_SKU, qty: 1 }],
      });
      const stages = [{ status: "pending", atMs: 0 }];
      setJourney({ orderId: created.id, stages, done: false });
      let status = created.status;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const o = await apiGetOrder(created.id);
        if (o.status !== status) {
          status = o.status;
          stages.push({ status, atMs: Math.round(performance.now() - t0) });
          setJourney({ orderId: created.id, stages: [...stages], done: false });
        }
        if (["shipped", "failed", "cancelled", "refunded"].includes(status)) break;
      }
      setJourney({
        orderId: created.id,
        stages,
        done: ["shipped", "failed", "cancelled", "refunded"].includes(status),
      });
    } catch (e) {
      setJourney({
        orderId: "",
        stages: [],
        done: true,
        error: e instanceof ApiError ? e.message : "Journey failed.",
      });
    } finally {
      setJourneyBusy(false);
    }
  };

  const runBurst = async () => {
    if (!user || burstBusy) return;
    const n = Math.min(Math.max(parseInt(burstN, 10) || 0, 1), 100);
    setBurstBusy(true);
    setBurst(null);
    burstAbort.current = false;
    const wall0 = performance.now();
    const durations: number[] = [];
    let ok = 0;
    let failed = 0;
    await Promise.allSettled(
      Array.from({ length: n }, async (_, i) => {
        if (burstAbort.current) return;
        const t0 = performance.now();
        try {
          await apiCreateOrder({
            customerId: user.id,
            total: 99 + (i % 10),
            items: [{ sku: JOURNEY_SKU, qty: 1 }],
          });
          ok++;
        } catch {
          failed++;
        }
        durations.push(performance.now() - t0);
      }),
    );
    const wallMs = Math.round(performance.now() - wall0);
    durations.sort((a, b) => a - b);
    const pct = (p: number) => Math.round(durations[Math.min(durations.length - 1, Math.floor((p / 100) * durations.length))] ?? 0);
    setBurst({
      ok,
      failed,
      p50: pct(50),
      p95: pct(95),
      max: Math.round(durations[durations.length - 1] ?? 0),
      wallMs,
    });
    setBurstBusy(false);
  };

  const activeList = Object.entries(activeFlags);

  return (
    <AdminShell
      crumbs={[{ label: "Platform" }, { label: "Chaos Lab" }]}
      title="Chaos Lab"
      actions={
        <button
          onClick={resetAll}
          disabled={busyScenario !== null}
          className="inline-flex h-9 items-center rounded-sm bg-zinc-950 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {busyScenario === "reset" ? "Resetting…" : "Reset all kill-switches"}
        </button>
      }
    >
      <div className="space-y-5">
        <p className="-mt-1 max-w-3xl text-[13.5px] leading-relaxed text-zinc-600">
          The guided resilience playground: break one service at a time, watch the saga
          compensate, then replay the dead letters. Nothing here needs a restart —
          every switch is a runtime flag. Start with a healthy fleet, then run scenario 1.
        </p>

        {/* Fleet */}
        <Section title="Fleet — what's running">
          <FleetGrid fleet={fleet} />
          <p className="mt-2 font-mono text-[11.5px] text-zinc-500">
            compose: 1 replica each · k8s: HPA 2–10 on CPU · gateway fans out, no shared DB between services
          </p>
        </Section>

        {/* Active flags */}
        {activeList.length > 0 && (
          <div role="alert" className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-bold text-zinc-950">
              Chaos active: {activeList.map(([k, v]) => `${k}=${v}`).join(" · ")}
            </p>
          </div>
        )}
        {scenarioError && (
          <p role="alert" className="rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3 text-[14px] text-[#8f1d17]">
            {scenarioError}
          </p>
        )}

        {/* Scenarios */}
        <Section
          title="One-click outage scenarios"
          blurb="Each card breaks exactly one thing. Apply, place a test order below (or watch live traffic), then reset and replay the DLQ."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SCENARIOS.map((sc) => (
              <div key={sc.id} className="flex flex-col rounded-sm border border-zinc-200 px-4 py-3.5">
                <p className="text-[13.5px] font-bold text-zinc-950">{sc.title}</p>
                <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-zinc-600">{sc.blurb}</p>
                <p className="mt-2 font-mono text-[11.5px] text-zinc-500">
                  {sc.apply.map((a) => `${a.flag}=${a.value}`).join(" ")}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => void applyScenario(sc)}
                    disabled={busyScenario !== null}
                    className="h-9 rounded-sm bg-[#b3261e] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#8f1d17] disabled:opacity-60"
                  >
                    {busyScenario === sc.id ? "Breaking…" : "Break it"}
                  </button>
                  <span className="text-[12px] text-zinc-500">watch:</span>
                  {sc.watch.map((w) => (
                    <Link key={w.href + w.label} href={w.href} className="text-[12.5px] font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600">
                      {w.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Journey timer */}
        <Section
          title="Order journey timer"
          blurb="Places one real test order and times every saga transition. Run it healthy, then run it mid-outage."
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runJourney}
              disabled={journeyBusy}
              className="h-10 rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {journeyBusy ? "Order in flight…" : "Place test order (£1,049 MacBook Air)"}
            </button>
            {journey && journey.orderId && (
              <Link href={`/orders/${journey.orderId}`} className="text-[13px] font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600">
                Open in orders →
              </Link>
            )}
          </div>
          {journey?.error && (
            <p role="alert" className="mt-3 max-w-2xl rounded-sm border border-[#b3261e] bg-red-50 px-3 py-2 text-[13px] text-[#8f1d17]">
              {journey.error}
            </p>
          )}
          {journey && journey.stages.length > 0 && (
            <ol className="mt-4 max-w-2xl divide-y divide-zinc-100 rounded-sm border border-zinc-200">
              {JOURNEY_STAGES.map((s) => {
                const hit = journey.stages.find((st) => st.status === s);
                const failedHere = journey.stages.some((st) => st.status === "failed");
                return (
                  <li key={s} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 rounded-full ${hit ? "bg-green-700" : failedHere ? "bg-zinc-200" : "animate-pulse bg-zinc-300"}`}
                    />
                    <span className="font-mono font-semibold capitalize text-zinc-950">{s}</span>
                    <span className="ml-auto tabular-nums text-zinc-600">
                      {hit ? `+${(hit.atMs / 1000).toFixed(1)}s` : failedHere ? "skipped (failed)" : "waiting…"}
                    </span>
                  </li>
                );
              })}
              {journey.stages.some((st) => st.status === "failed") && (
                <li className="bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-[#8f1d17]">
                  payment.failed → inventory.released compensation · no charge made
                </li>
              )}
              {journey.done && (
                <li className="bg-zinc-50 px-4 py-2.5 text-[13px] text-zinc-700">
                  Total wall time:{" "}
                  <strong className="tabular-nums">
                    +{((journey.stages[journey.stages.length - 1]?.atMs ?? 0) / 1000).toFixed(1)}s
                  </strong>{" "}
                  · Kafka poll intervals (2s) dominate — the DB writes are milliseconds.
                </li>
              )}
            </ol>
          )}
        </Section>

        {/* Load burst */}
        <Section
          title="Load burst"
          blurb="Fires N real order creations at the gateway concurrently and reports latency. Watch the fleet grid and DLQ while it runs."
        >
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="burst-n" className="text-[13px] font-semibold">Orders</label>
            <input
              id="burst-n"
              value={burstN}
              inputMode="numeric"
              onChange={(e) => setBurstN(e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="h-10 w-20 rounded-sm border border-zinc-300 px-3 text-[13.5px] focus:border-zinc-950 focus:outline-none"
            />
            <button
              onClick={runBurst}
              disabled={burstBusy}
              className="h-10 rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {burstBusy ? "Blasting…" : "Fire burst"}
            </button>
            <span className="text-[12.5px] text-zinc-500">max 100 · creates real test orders</span>
          </div>
          {burst && (
            <dl className="mt-4 grid max-w-3xl grid-cols-3 gap-2.5 md:grid-cols-6">
              {[
                ["Accepted", String(burst.ok)],
                ["Rejected", String(burst.failed)],
                ["p50", `${burst.p50}ms`],
                ["p95", `${burst.p95}ms`],
                ["Max", `${burst.max}ms`],
                ["Wall", `${(burst.wallMs / 1000).toFixed(1)}s`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm border border-zinc-200 px-3 py-2">
                  <dt className="text-[11.5px] font-medium text-zinc-500">{label}</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-zinc-950">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        {/* Breakers */}
        <Section
          id="breakers"
          title="Circuit breakers — live"
          blurb="Closed passes traffic, open fails fast, half-open probes recovery. Force failures with the payment scenarios above."
        >
          <div className="grid max-w-3xl gap-3 md:grid-cols-2">
            <BreakerCard title="Payment provider" service="payments" tick={tick} />
            <BreakerCard title="Notification sender" service="notifications" tick={tick} />
          </div>
        </Section>

        {/* Topology */}
        <Section
          title="Request path & data plane"
          blurb="How traffic and data actually flow. The gateway is the only entrypoint; services never call each other."
        >
          <div className="space-y-4 font-mono text-[12px]">
            <div>
              <p className="mb-2 font-sans text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500">Synchronous (HTTP via gateway)</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm bg-zinc-950 px-2.5 py-1.5 font-bold text-white">browser</span>
                <span aria-hidden="true" className="text-zinc-400">→</span>
                <span className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5">gateway :8080</span>
                <span aria-hidden="true" className="text-zinc-400">→</span>
                {[
                  ["orders", ":3000"],
                  ["inventory", ":3001"],
                  ["shipping", ":3002"],
                  ["payments", ":3003"],
                  ["notify", ":3004"],
                  ["cart", ":3005"],
                ].map(([name, port]) => (
                  <span key={name} className="flex items-center gap-1.5">
                    <span className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5">
                      <span
                        aria-hidden="true"
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                          fleet[name === "notify" ? "notifications" : name === "orders" ? "orders" : name]?.ok === false
                            ? "bg-[#b3261e]"
                            : "bg-green-700"
                        }`}
                      />
                      {name} {port}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-sans text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500">Async (Kafka saga) + data</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5">order.created → inventory.reserved → payment.* → shipping.dispatched</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5">postgres (1 db per service)</span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5">kafka (events + *.DLQ)</span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5">redis (gateway rate limit)</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Fine-grained toggles */}
        <Section
          title="Fine-grained kill-switches"
          blurb="Same flags the service pages expose, all in one place."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(CHAOS_FLAGS) as DlqService[]).map((s) => (
              <ChaosPanelMini key={s} service={s} onChanged={refreshFlags} />
            ))}
          </div>
        </Section>
      </div>
    </AdminShell>
  );
}

function ChaosPanelMini({ service, onChanged }: { service: DlqService; onChanged: () => void }) {
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGetChaos(service)
      .then((r) => {
        if (!cancelled) setFlags(r.flags);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [service]);

  const toggle = async (flag: string, value: string) => {
    setBusy(true);
    try {
      const r = await apiSetChaos(service, flag, value === "1" ? "" : value || "1");
      setFlags(r.flags);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-sm border border-zinc-200 px-3.5 py-3">
      <p className="font-mono text-[12.5px] font-bold text-zinc-950">{service}</p>
      <div className="mt-2 space-y-1.5">
        {CHAOS_FLAGS[service].map(({ flag, label }) => {
          const active = flags[flag] !== undefined && flags[flag] !== "";
          return (
            <div key={flag} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate text-zinc-700" title={`${label} (${flag})`}>{label}</span>
              <button
                onClick={() => void toggle(flag, flag.includes("CODE") || flag.includes("LATENCY") ? "card_declined" : "1")}
                disabled={busy}
                aria-pressed={active}
                className={`h-7 shrink-0 rounded-sm px-2.5 font-semibold ${
                  active ? "bg-[#b3261e] text-white hover:bg-[#8f1d17]" : "border border-zinc-300 hover:border-zinc-950"
                } disabled:opacity-60`}
              >
                {active ? "ON" : "off"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
