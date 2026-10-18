import { generateState } from "arctic";
import { linkedinClient, linkedinEnabled } from "@/lib/auth/linkedin";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  if (!linkedinEnabled()) {
    return new Response("LinkedIn sign-in is not configured", { status: 404 });
  }
  const state = generateState();
  const url = (await linkedinClient()).createAuthorizationURL(state, ["openid", "profile", "email"]);

  const session = await getSession();
  session.oauthState = state;
  await session.save();

  return Response.redirect(url.toString(), 302);
}
