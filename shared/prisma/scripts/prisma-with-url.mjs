// Wrapper around the Prisma CLI that mirrors shared/prisma/src/client.ts:
// if DATABASE_URL is not set, synthesize it from PGHOST/PGPORT/PGUSER/
// PGPASSWORD/PGDATABASE (or POSTGRES_* / POSTGRES_DB) so per-service .env
// files keep working for `prisma migrate deploy`, `db push`, `generate`, etc.
// Usage: node <path-to>/prisma-with-url.mjs <prisma args...>
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let dotenv;
try {
  dotenv = require("dotenv");
} catch {
  // dotenv is a dependency of shared-prisma and every service; this is a fallback
  // in case module resolution fails from a different CWD.
  dotenv = (await import("dotenv")).default;
}

// Load CWD .env exactly like `prisma` CLI does, so behavior is identical
// except we fill in DATABASE_URL when it is missing.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function ensureDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return { url: direct, synthesized: false };

  const host = process.env.PGHOST ?? process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.PGPORT ?? process.env.POSTGRES_PORT ?? "5432";
  const user = process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres";
  const password =
    process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? "00000000";
  const database =
    process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "app";

  const url =
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}`;
  process.env.DATABASE_URL = url;
  return { url, synthesized: true };
}

const { url, synthesized } = ensureDatabaseUrl();
if (synthesized) {
  const safe = url.replace(/:([^:@/]+)@/, ":***@");
  console.log(`[prisma-with-url] DATABASE_URL was missing; using ${safe}`);
}

const args = process.argv.slice(2);
const prismaBin = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(prismaBin, ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(`[prisma-with-url] failed to launch Prisma: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
