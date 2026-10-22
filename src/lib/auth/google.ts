import "server-only";
import { Google } from "arctic";
import { appUrl } from "./app-url";

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function googleClient() {
  return new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${await appUrl()}/api/auth/google/callback`,
  );
}
