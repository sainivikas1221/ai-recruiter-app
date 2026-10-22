import "server-only";
import { TransactionRollbackError, and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { CREDITS_PER_APPLICATION, RUPEES_PER_CREDIT } from "./credit-rules";

export * from "./credit-rules";

export async function getCredits(userId: string): Promise<number> {
  const [row] = await db.select({ credits: schema.users.credits }).from(schema.users).where(eq(schema.users.id, userId));
  return row?.credits ?? 0;
}

/** Credits that applications already waiting in the queue will use. */
export async function creditsOnHold(userId: string, exceptJobIds: string[] = []): Promise<number> {
  const waiting = await db
    .select({ jobId: schema.applications.jobId })
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.userId, userId),
        eq(schema.applications.appliedBy, "jobpilot"),
        eq(schema.applications.creditsCharged, 0),
        inArray(schema.applications.status, ["queued", "filling"]),
      ),
    );
  return waiting.filter((w) => !exceptJobIds.includes(w.jobId)).length * CREDITS_PER_APPLICATION;
}

/** Credits free to spend on new applications. */
export async function spendableCredits(userId: string, exceptJobIds: string[] = []) {
  const [credits, held] = await Promise.all([getCredits(userId), creditsOnHold(userId, exceptJobIds)]);
  return Math.max(0, credits - held);
}

/**
 * Takes the credits for one application JobPilot completed. Does nothing if this
 * application was already paid for. Returns false when the balance is too low.
 */
export async function chargeForApplication(app: { id: string; userId: string; title: string; company: string }) {
  try {
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(schema.applications)
        .set({ creditsCharged: CREDITS_PER_APPLICATION })
        .where(and(eq(schema.applications.id, app.id), eq(schema.applications.creditsCharged, 0)))
        .returning({ id: schema.applications.id });
      if (!claimed) return;
      const [paid] = await tx
        .update(schema.users)
        .set({ credits: sql`${schema.users.credits} - ${CREDITS_PER_APPLICATION}` })
        .where(and(eq(schema.users.id, app.userId), gte(schema.users.credits, CREDITS_PER_APPLICATION)))
        .returning({ id: schema.users.id });
      if (!paid) tx.rollback();
      await tx.insert(schema.creditTransactions).values({
        userId: app.userId,
        amount: -CREDITS_PER_APPLICATION,
        kind: "application",
        description: `${app.title} at ${app.company}`,
        applicationId: app.id,
      });
    });
    return true;
  } catch (err) {
    if (err instanceof TransactionRollbackError) return false;
    throw err;
  }
}

/** Test purchase: adds credits straight away. No payment is taken yet. */
export async function addPurchasedCredits(userId: string, credits: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.users)
      .set({ credits: sql`${schema.users.credits} + ${credits}` })
      .where(eq(schema.users.id, userId));
    await tx.insert(schema.creditTransactions).values({
      userId,
      amount: credits,
      kind: "purchase",
      description: `Test purchase: ${credits} credits for ₹${credits * RUPEES_PER_CREDIT}`,
    });
  });
}

export async function creditHistory(userId: string, limit = 50) {
  return db
    .select()
    .from(schema.creditTransactions)
    .where(eq(schema.creditTransactions.userId, userId))
    .orderBy(desc(schema.creditTransactions.createdAt))
    .limit(limit);
}
