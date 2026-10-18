import "server-only";
import path from "node:path";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { databaseKind, db } from "./index";

/** Creates or updates the tables. Safe to run on every start: applied migrations are skipped. */
export async function migrateDatabase() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (databaseKind() === "embedded") {
    await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder });
  } else {
    await migratePg(db, { migrationsFolder });
  }
}
