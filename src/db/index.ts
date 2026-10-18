import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

/** Hosted Postgres, when configured. Vercel's Postgres integration sets POSTGRES_URL. */
export function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

/**
 * Where the built-in database lives when no DATABASE_URL is set. It sits in the
 * user's home folder so a fresh download of the app keeps the same data.
 */
export const LOCAL_DATA_DIR = process.env.JOBPILOT_DATA_DIR || path.join(os.homedir(), ".jobpilot");

const globalForDb = globalThis as unknown as { db?: Database; kind?: "postgres" | "embedded" };

function open(): Database {
  if (globalForDb.db) return globalForDb.db;
  const url = databaseUrl();
  if (url) {
    globalForDb.db = drizzlePg(new Pool({ connectionString: url }), { schema });
    globalForDb.kind = "postgres";
  } else {
    // No database configured: run Postgres inside the app (PGlite), stored on disk.
    // Good for running on your own computer; use real Postgres when hosting.
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    const client = new PGlite(path.join(LOCAL_DATA_DIR, "db"));
    // Both drivers expose the same query builder; the result types differ only in metadata.
    globalForDb.db = drizzlePglite(client, { schema }) as unknown as Database;
    globalForDb.kind = "embedded";
  }
  return globalForDb.db;
}

export function databaseKind() {
  open();
  return globalForDb.kind!;
}

/** Opened on first use, so building the app never touches a database. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = open();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
