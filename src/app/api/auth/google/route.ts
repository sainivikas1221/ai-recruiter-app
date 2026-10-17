import { generateCodeVerifier, generateState } from "arctic";
import { googleClient, googleEnabled } from "@/lib/auth/google";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  if (!googleEnabled()) {
    return new Response("Google sign-in is not configured", { status: 404 });
  }
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);

  const session = await getSession();
  session.oauthState = state;
  session.oauthVerifier = verifier;
  await session.save();

  return Response.redirect(url.toString(), 302);
}
