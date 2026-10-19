import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

/** How long a reset link works. */
export const RESET_TTL_MINUTES = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a one-time reset token for the user. Earlier unused tokens stop working. */
export async function createResetToken(userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  await db.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, userId));
  await db.insert(schema.passwordResets).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + RESET_TTL_MINUTES * 60 * 1000),
  });
  return token;
}

/** The user a token belongs to, if it is unused and not expired. */
export async function findResetToken(token: string, now = new Date()) {
  const [row] = await db
    .select({ id: schema.passwordResets.id, userId: schema.passwordResets.userId })
    .from(schema.passwordResets)
    .where(
      and(
        eq(schema.passwordResets.tokenHash, hashToken(token)),
        isNull(schema.passwordResets.usedAt),
        gt(schema.passwordResets.expiresAt, now),
      ),
    );
  return row ?? null;
}

/** Marks every reset token of the user as used. */
export async function finishReset(userId: string) {
  await db.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, userId));
}
