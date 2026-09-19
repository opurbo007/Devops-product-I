import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

// Re-export the Prisma namespace (Decimal, InputJsonValue,
// PrismaClientKnownRequestError, ...) bound to THIS package's generated
// client. Services must import Prisma types from "shared-prisma" (or their
// local `./prisma.js` shim) — never from "@prisma/client" directly — because
// each service's own node_modules holds only an empty Prisma stub, while the
// real generated client lives in shared/prisma.
export { Prisma };
export type { PrismaClient };

// Back-compat with the old pg Pool config: if DATABASE_URL is not set,
// synthesize it from PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE so existing
// per-service env files keep working. Prisma itself only reads DATABASE_URL.
function ensureDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const host = process.env.PGHOST ?? process.env.POSTGRES_HOST ?? "localhost";
  const port = Number(process.env.PGPORT ?? process.env.POSTGRES_PORT ?? 5432);
  const user = process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres";
  const password =
    process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? "00000000";
  // NOTE: services previously defaulted to different DB names
  // (cart, payment, shipping, notification, app). Under the shared schema
  // every DB holds all tables, so default to "app" unless PGDATABASE is set.
  // Prefer setting DATABASE_URL explicitly per service (see .env.example).
  const database =
    process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "app";

  const url =
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}`;
  process.env.DATABASE_URL = url;
  return url;
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

// Row shape for the outbox relay (SELECT ... FOR UPDATE SKIP LOCKED).
export interface OutboxRow {
  id: string;
  topic: string;
  payload: unknown;
}

// Claim up to `limit` unsent outbox rows with row-level locking.
// MUST be called inside a prisma.$transaction callback; the raw query runs
// on the transaction client so claimed rows stay locked until commit —
// the Prisma equivalent of the old `SELECT ... FOR UPDATE SKIP LOCKED`.
export async function claimOutboxRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  limit = 100,
): Promise<OutboxRow[]> {
  return tx.$queryRaw<OutboxRow[]>`
    SELECT id::text AS id, topic, payload
    FROM outbox
    WHERE sent = false
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT ${limit}
  `;
}

export async function markOutboxSent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  id: string,
): Promise<void> {
  await tx.$executeRaw`UPDATE outbox SET sent = true WHERE id = ${id}::uuid`;
}
