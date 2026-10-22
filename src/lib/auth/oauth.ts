import "server-only";
import { eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { cleanName } from "@/lib/ai/heuristic";
import { appUrl } from "./app-url";
import { getSession } from "./session";
import { trialEnd } from "./user";

export type OAuthProvider = "google" | "linkedin";
export type OAuthClaims = { sub: string; email?: string; email_verified?: boolean | string; name?: string };

const ID_COLUMN = { google: schema.users.googleId, linkedin: schema.users.linkedinId } as const;
const ID_FIELD = { google: "googleId", linkedin: "linkedinId" } as const;

export async function redirectTo(path: string) {
  return Response.redirect(new URL(path, await appUrl()), 302);
}

/** Signs in (or signs up) the person a provider vouched for, linking by provider id or email. */
export async function finishOAuthSignIn(provider: OAuthProvider, claims: OAuthClaims) {
  const session = await getSession();
  if (!claims.email || claims.email_verified === false || claims.email_verified === "false") {
    await session.save();
    return redirectTo(`/login?error=${provider}-email`);
  }
  const email = claims.email.toLowerCase();

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(or(eq(ID_COLUMN[provider], claims.sub), eq(schema.users.email, email)));

  let userId: string;
  let isNew = false;
  if (existing) {
    userId = existing.id;
    if (!existing[ID_FIELD[provider]]) {
      await db
        .update(schema.users)
        .set({ [ID_FIELD[provider]]: claims.sub })
        .where(eq(schema.users.id, userId));
    }
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({ email, name: cleanName(claims.name), [ID_FIELD[provider]]: claims.sub, trialEndsAt: trialEnd() })
      .returning({ id: schema.users.id });
    userId = created.id;
    isNew = true;
  }

  session.userId = userId;
  await session.save();
  return redirectTo(isNew ? "/onboarding" : "/jobs");
}
