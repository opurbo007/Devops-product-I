import { seedEvents, type StreamEvent } from "./events";

export type DlqStatus = "Open" | "Replaying" | "Resolved";

export type DlqEntry = StreamEvent & {
  failureType: string;
  error: string;
  dlqStatus: DlqStatus;
  firstFailedAt: string;
  ageMin: number;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveNote: string | null;
};

export const FAILURE_TYPES = [
  "Downstream timeout",
  "Schema incompatibility",
  "Poison pill payload",
  "Constraint violation",
  "Deserialization error",
] as const;

const ERRORS: Record<string, string[]> = {
  "Downstream timeout": [
    "POST https://erp-proxy.internal/reserve timed out after 5000ms (attempt exhausted)",
    "Consumer stock-sync: commit offset timed out after 3 retries",
  ],
  "Schema incompatibility": [
    "Field 'totalMinor' missing: payload validated against order.created v3, got v2",
    "Unknown enum value 'klarna_pay_later' for payment.method (schema v3)",
  ],
  "Poison pill payload": [
    "Unexpected null byte at offset 412 — message skipped after 5 attempts",
  ],
  "Constraint violation": [
    "Duplicate key (order_id, event_seq): exactly-once guard rejected redelivery",
    "FK violation: customer cus_9f21 missing in read model — projection lag",
  ],
  "Deserialization error": [
    "Avro decode failed: truncated buffer at partition 2, offset 4820877",
  ],
};

/** Deterministic DLQ: failed stream events enriched + a resolved history tail. */
export function seedDlq(): DlqEntry[] {
  const failed = seedEvents(64).filter((e) => e.status !== "Delivered");
  const out: DlqEntry[] = failed.slice(0, 9).map((e, i) => {
    const ft = FAILURE_TYPES[i % FAILURE_TYPES.length];
    const errs = ERRORS[ft];
    const resolved = i >= 6;
    return {
      ...e,
      failureType: ft,
      error: errs[i % errs.length],
      dlqStatus: resolved ? "Resolved" : "Open",
      firstFailedAt: e.timestamp,
      ageMin: 18 + i * 37,
      resolvedAt: resolved ? "11:02" : null,
      resolvedBy: resolved ? (i % 2 ? "Amara O." : "Dev P.") : null,
      resolveNote: resolved
        ? i % 2
          ? "Replayed after schema registry update — delivered on attempt 6."
          : "Duplicate of an already-applied projection — safely discarded."
        : null,
    };
  });
  return out;
}

export function ageLabel(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
