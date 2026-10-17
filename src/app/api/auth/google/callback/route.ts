import { type NextRequest } from "next/server";
import { decodeIdToken } from "arctic";
import { eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { googleClient, googleEnabled } from "@/lib/auth/google";
import { getSession } from "@/lib/auth/session";
import { trialEnd } from "@/lib/auth/user";

type GoogleClaims = { sub: string; email?: string; email_verified?: boolean; name?: string };

export async function GET(request: NextRequest) {
  if (!googleEnabled()) return new Response("Google sign-in is not configured", { status: 404 });

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const session = await getSession();
  const { oauthState, oauthVerifier } = session;
  session.oauthState = undefined;
  session.oauthVerifier = undefined;

  if (!code || !state || !oauthState || !oauthVerifier || state !== oauthState) {
    await session.save();
    return Response.redirect(new URL("/login?error=google", request.url), 302);
  }

  let claims: GoogleClaims;
  try {
    const tokens = await googleClient().validateAuthorizationCode(code, oauthVerifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    await session.save();
    return Response.redirect(new URL("/login?error=google", request.url), 302);
  }
  if (!claims.email || claims.email_verified === false) {
    await session.save();
    return Response.redirect(new URL("/login?error=google-email", request.url), 302);
  }
  const email = claims.email.toLowerCase();

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(or(eq(schema.users.googleId, claims.sub), eq(schema.users.email, email)));

  let userId: string;
  let isNew = false;
  if (existing) {
    userId = existing.id;
    if (!existing.googleId) {
      await db.update(schema.users).set({ googleId: claims.sub }).where(eq(schema.users.id, userId));
    }
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({ email, name: claims.name ?? null, googleId: claims.sub, trialEndsAt: trialEnd() })
      .returning({ id: schema.users.id });
    userId = created.id;
    isNew = true;
  }

  session.userId = userId;
  await session.save();
  return Response.redirect(new URL(isNew ? "/onboarding" : "/jobs", request.url), 302);
}
