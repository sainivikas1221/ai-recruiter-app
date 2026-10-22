import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { databaseUrl, LOCAL_DATA_DIR } from "@/db";

export type SessionData = {
  userId?: string;
  // Short-lived values for the Google sign-in round trip.
  oauthState?: string;
  oauthVerifier?: string;
};

/**
 * The key that encrypts sign-in cookies. Uses SESSION_SECRET when set; otherwise
 * derives one from the database password, or keeps a generated one next to the
 * built-in database, so the app runs without any configuration.
 */
function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured) {
    if (configured.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    return configured;
  }
  const url = databaseUrl();
  if (url) return createHash("sha256").update(`jobpilot-session:${url}`).digest("hex");

  const file = path.join(LOCAL_DATA_DIR, "session-secret");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    fs.writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return fs.readFileSync(file, "utf8").trim();
}

function sessionOptions(): SessionOptions {
  return {
    password: sessionSecret(),
    cookieName: "jobpilot_session",
    ttl: 60 * 60 * 24 * 30,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
