import "server-only";
import { LinkedIn } from "arctic";
import { appUrl } from "./app-url";

export function linkedinEnabled() {
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

/** "Sign In with LinkedIn using OpenID Connect": gives name and email, not work history. */
export async function linkedinClient() {
  return new LinkedIn(
    process.env.LINKEDIN_CLIENT_ID!,
    process.env.LINKEDIN_CLIENT_SECRET!,
    `${await appUrl()}/api/auth/linkedin/callback`,
  );
}
