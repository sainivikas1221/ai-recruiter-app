import { type NextRequest } from "next/server";
import { decodeIdToken } from "arctic";
import { linkedinClient, linkedinEnabled } from "@/lib/auth/linkedin";
import { finishOAuthSignIn, redirectTo, type OAuthClaims } from "@/lib/auth/oauth";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  if (!linkedinEnabled()) return new Response("LinkedIn sign-in is not configured", { status: 404 });

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const session = await getSession();
  const { oauthState } = session;
  session.oauthState = undefined;

  if (!code || !state || !oauthState || state !== oauthState) {
    await session.save();
    return redirectTo("/login?error=linkedin");
  }

  let claims: OAuthClaims;
  try {
    const tokens = await (await linkedinClient()).validateAuthorizationCode(code);
    claims = decodeIdToken(tokens.idToken()) as OAuthClaims;
  } catch {
    await session.save();
    return redirectTo("/login?error=linkedin");
  }
  return finishOAuthSignIn("linkedin", claims);
}
