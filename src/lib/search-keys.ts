import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/** The job search API keys a user can paste in on their own computer. */
export const SEARCH_KEYS = [
  { name: "JSEARCH_API_KEY", label: "Google Jobs key (X-RapidAPI-Key)" },
  { name: "ADZUNA_APP_ID", label: "Adzuna App ID" },
  { name: "ADZUNA_APP_KEY", label: "Adzuna App Key" },
  { name: "JOOBLE_API_KEY", label: "Jooble API key" },
] as const;
export type SearchKeyName = (typeof SEARCH_KEYS)[number]["name"];

/** Keys are pasted in the app only when it runs on the user's own computer; a hosted site uses its env settings. */
export function canEditSearchKeys() {
  return Boolean(process.env.JOBPILOT_LOCAL);
}

// Same file scripts/start.mjs reads at startup, so saved keys survive restarts and new downloads.
function keysFile() {
  return path.join(process.env.JOBPILOT_DATA_DIR || path.join(homedir(), ".jobpilot"), "keys.env");
}

/** Which keys are set. Never returns the values. */
export function searchKeyStatus(): Record<SearchKeyName, boolean> {
  return Object.fromEntries(SEARCH_KEYS.map((k) => [k.name, Boolean(process.env[k.name])])) as Record<
    SearchKeyName,
    boolean
  >;
}

/** Saves the given keys to keys.env (keeping other lines) and applies them to the running app. */
export function saveSearchKeys(values: Partial<Record<SearchKeyName, string>>) {
  const file = keysFile();
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : [];
  for (const [name, value] of Object.entries(values)) {
    if (!value) continue;
    const at = lines.findIndex((l) => new RegExp(`^\\s*${name}\\s*=`).test(l));
    if (at >= 0) lines[at] = `${name}=${value}`;
    else lines.push(`${name}=${value}`);
    process.env[name] = value;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, lines.filter((l, i) => l || i < lines.length - 1).join("\n") + "\n", { mode: 0o600 });
}
