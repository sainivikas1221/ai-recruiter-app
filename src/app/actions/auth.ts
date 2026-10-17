"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { trialEnd } from "@/lib/auth/user";

export type AuthState = { error?: string } | undefined;

const SignUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

const SignInSchema = z.object({
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (existing) return { error: "An account with this email already exists. Sign in instead." };

  const [user] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(password), trialEndsAt: trialEnd() })
    .returning({ id: schema.users.id });

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  redirect("/onboarding");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  redirect("/jobs");
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

/** Deletes the account. Resumes and preferences go with it (ON DELETE CASCADE). */
export async function deleteAccount(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  if (formData.get("confirm") !== "delete") redirect("/preferences?error=confirm-delete");
  await db.delete(schema.users).where(eq(schema.users.id, session.userId));
  session.destroy();
  redirect("/?deleted=1");
}
