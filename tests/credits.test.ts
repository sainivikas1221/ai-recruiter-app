import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.JOBPILOT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jobpilot-credits-"));
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;

const { db, schema } = await import("@/db");
const { migrateDatabase } = await import("@/db/migrate");
const credits = await import("@/lib/credits");

async function newUser() {
  const [user] = await db
    .insert(schema.users)
    .values({ email: `${crypto.randomUUID()}@example.com` })
    .returning();
  return user;
}

async function newApplication(userId: string, status: "queued" | "ready" = "queued") {
  const [app] = await db
    .insert(schema.applications)
    .values({
      userId,
      jobId: `test:${crypto.randomUUID()}`,
      company: "Acme",
      title: "Data Analyst",
      url: "https://example.com",
      source: "test",
      appliedBy: "jobpilot",
      status,
    })
    .returning();
  return app;
}

beforeAll(async () => {
  await migrateDatabase();
}, 60_000);

describe("credits", () => {
  it("gives new users 10 free credits", async () => {
    const user = await newUser();
    expect(await credits.getCredits(user.id)).toBe(10);
    expect(credits.applicationsFor(10)).toBe(5);
  });

  it("takes 2 credits per application, once", async () => {
    const user = await newUser();
    const app = await newApplication(user.id, "ready");
    expect(await credits.chargeForApplication(app)).toBe(true);
    expect(await credits.chargeForApplication(app)).toBe(true);
    expect(await credits.getCredits(user.id)).toBe(8);
    const history = await credits.creditHistory(user.id);
    expect(history.map((h) => h.amount)).toEqual([-2]);
  });

  it("refuses when the balance is too low and leaves everything unchanged", async () => {
    const user = await newUser();
    for (let i = 0; i < 5; i++) await credits.chargeForApplication(await newApplication(user.id, "ready"));
    expect(await credits.getCredits(user.id)).toBe(0);
    const app = await newApplication(user.id, "ready");
    expect(await credits.chargeForApplication(app)).toBe(false);
    expect(await credits.getCredits(user.id)).toBe(0);
    // Still unpaid, so it can be charged after buying more.
    await credits.addPurchasedCredits(user.id, 20);
    expect(await credits.chargeForApplication(app)).toBe(true);
    expect(await credits.getCredits(user.id)).toBe(18);
  });

  it("sets aside credits for jobs waiting in the queue", async () => {
    const user = await newUser();
    await newApplication(user.id);
    await newApplication(user.id);
    expect(await credits.creditsOnHold(user.id)).toBe(4);
    expect(await credits.spendableCredits(user.id)).toBe(6);
  });
});
