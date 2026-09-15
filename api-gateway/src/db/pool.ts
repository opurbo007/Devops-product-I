import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL?.trim() || undefined;

const pool = connectionString
  ? new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT ?? 30_000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT ?? 5_000),
    })
  : new Pool({
      host: process.env.PGHOST ?? process.env.POSTGRES_HOST ?? "localhost",
      port: Number(process.env.PGPORT ?? process.env.POSTGRES_PORT ?? 5432),
      user: process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres",
      password: process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? "00000000",
      database: process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "app",
      max: Number(process.env.PG_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT ?? 30_000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT ?? 5_000),
    });

pool.on("error", (err) => {
  console.error("Unexpected error on idle pg client", err);
});

export { pool };
export default pool;
