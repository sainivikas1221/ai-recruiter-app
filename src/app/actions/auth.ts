"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { trialEnd } from "@/lib/auth/user";
import { appUrl } from "@/lib/auth/app-url";
import { createResetToken, findResetToken, finishReset, RESET_TTL_MINUTES } from "@/lib/auth/reset";
import { emailConfigured, sendEmail } from "@/lib/email";

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
  if (user && !user.passwordHash) {
    // Accounts made with LinkedIn or Google have no password until the person sets one.
    const via = user.linkedinId ? "LinkedIn" : user.googleId ? "Google" : null;
    return {
      error: via
        ? `This account signs in with ${via}. Use the ${via} button, or set a password with "Forgot password?".`
        : 'This account has no password yet. Use "Forgot password?" to set one.',
    };
  }
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Email or password is incorrect. Forgot it? Use "Forgot password?" below.' };
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  redirect("/jobs");
}

export type ResetRequestState = { error?: string; sent?: boolean; link?: string } | undefined;

const ResetRequestSchema = z.object({
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
});

/**
 * Emails a one-time link for setting a new password. Says the same thing whether or not the
 * email has an account, so the form can't be used to find out who has signed up.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = ResetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email } = parsed.data;

  const base = await appUrl();
  const local = new URL(base).hostname === "localhost" || Boolean(process.env.JOBPILOT_LOCAL);
  if (!emailConfigured() && !local) {
    return { error: "Password reset by email isn't set up on this site yet. Please contact support." };
  }

  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (!user) return { sent: true };

  const link = `${base}/reset-password?token=${await createResetToken(user.id)}`;
  // On your own computer without an email sender, show the link instead of sending it.
  if (!emailConfigured()) return { sent: true, link };

  await sendEmail(
    email,
    "Reset your JobPilot password",
    `Hi${user.name ? ` ${user.name}` : ""},\n\n` +
      `Use this link to set a new JobPilot password. It works once, for ${RESET_TTL_MINUTES} minutes:\n\n` +
      `${link}\n\nIf you didn't ask for this, you can ignore this email.`,
  );
  return { sent: true };
}

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = ResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { token, password } = parsed.data;

  const reset = await findResetToken(token);
  if (!reset) return { error: "This link has expired or was already used. Ask for a new one." };

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(schema.users.id, reset.userId));
  await finishReset(reset.userId);

  const session = await getSession();
  session.userId = reset.userId;
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
