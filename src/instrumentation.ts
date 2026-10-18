export async function register() {
  // Runs once when the server starts: make sure the database tables exist.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateDatabase } = await import("./db/migrate");
    await migrateDatabase();
  }
}
