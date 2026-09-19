// Prisma client for this service — re-exported from the shared Prisma package.
// Replaces the old raw-pg `pool.ts` (kept for reference); all queries go through Prisma.
import { prisma, Prisma } from "shared-prisma";
export { prisma, Prisma, claimOutboxRows, markOutboxSent } from "shared-prisma";
export type { OutboxRow } from "shared-prisma";
export default prisma;
