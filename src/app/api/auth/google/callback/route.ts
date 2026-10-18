import { type NextRequest } from "next/server";
import { decodeIdToken } from "arctic";
import { googleClient, googleEnabled } from "@/lib/auth/google";
import { finishOAuthSignIn, redirectTo, type OAuthClaims } from "@/lib/auth/oauth";
import { getSession } from "@/lib/auth/session";

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
    return redirectTo("/login?error=google");
  }

  let claims: OAuthClaims;
  try {
    const tokens = await (await googleClient()).validateAuthorizationCode(code, oauthVerifier);
    claims = decodeIdToken(tokens.idToken()) as OAuthClaims;
  } catch {
    await session.save();
    return redirectTo("/login?error=google");
  }
  return finishOAuthSignIn("google", claims);
}
