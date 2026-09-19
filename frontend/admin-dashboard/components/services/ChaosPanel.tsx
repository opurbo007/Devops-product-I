"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  apiGetChaos,
  apiSetChaos,
  CHAOS_FLAGS,
  type DlqService,
} from "@/lib/api";

// Runtime failure toggles for one service. Flips the same env-backed flags
// the consumers read per call — no restart, immediate chaos for resilience
// drills. Admin-only (backend enforces the role).
export default function ChaosPanel({ service }: { service: DlqService }) {
  const defs = CHAOS_FLAGS[service];
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetChaos(service)
      .then((r) => {
        if (!cancelled) {
          setFlags(r.flags);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Chaos controls unavailable.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  const apply = async (flag: string, value: string) => {
    setBusy(flag);
    setError(null);
    try {
      const r = await apiSetChaos(service, flag, value);
      setFlags(r.flags);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Toggle failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-sm border border-amber-300 bg-amber-50/40">
      <h2 className="border-b border-amber-200 px-4 py-2.5 text-[13px] font-bold text-zinc-950 sm:px-5">
        Chaos kill-switches
      </h2>
      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        <p className="text-[12.5px] leading-relaxed text-zinc-600">
          Fail this service on demand and watch retry, DLQ and compensation.
          Empty value clears the flag.
        </p>
        {error && (
          <p role="alert" className="rounded-sm border border-[#b3261e] bg-red-50 px-3 py-2 text-[12.5px] text-[#8f1d17]">
            {error}
          </p>
        )}
        {defs.map(({ flag, label }) => {
          const active = flags[flag] !== undefined && flags[flag] !== "";
          const draft = drafts[flag] ?? flags[flag] ?? "";
          return (
            <div key={flag} className="rounded-sm border border-zinc-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-zinc-950">{label}</span>
                <Badge variant={active ? "danger" : "muted"}>
                  {active ? `ON · ${flags[flag]}` : "off"}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-[11.5px] text-zinc-500">{flag}</p>
              <div className="mt-2 flex gap-1.5">
                <input
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [flag]: e.target.value }))}
                  placeholder='e.g. "1" or "card_declined"'
                  aria-label={`Value for ${flag}`}
                  className="h-9 min-w-0 flex-1 rounded-sm border border-zinc-300 px-2.5 font-mono text-[12.5px] focus:border-zinc-950 focus:outline-none"
                />
                <button
                  onClick={() => void apply(flag, draft)}
                  disabled={busy === flag}
                  className="h-9 rounded-sm bg-zinc-950 px-3 text-[12.5px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {busy === flag ? "…" : "Set"}
                </button>
                {active && (
                  <button
                    onClick={() => void apply(flag, "")}
                    disabled={busy === flag}
                    className="h-9 rounded-sm border border-zinc-300 px-3 text-[12.5px] font-semibold hover:border-zinc-950 disabled:opacity-60"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
