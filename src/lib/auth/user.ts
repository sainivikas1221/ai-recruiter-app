import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "./session";

export type CurrentUser = { id: string; email: string; name: string | null; linkedin: boolean };

/** The signed-in user, or null. Cached for the length of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      linkedinId: schema.users.linkedinId,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId));
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, linkedin: Boolean(user.linkedinId) };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const TRIAL_DAYS = 90;

export function trialEnd(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
