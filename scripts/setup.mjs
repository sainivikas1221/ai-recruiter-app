// First-time setup: asks for the database link (and optional API keys),
// writes .env.local, then creates the database tables.
// Run with: npm run setup
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ENV_FILE = ".env.local";

function readEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const env = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// People often copy more than the link itself, e.g. psql 'postgresql://…'.
export function cleanDatabaseUrl(input) {
  const match = input.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
  return match ? match[0] : null;
}

async function main() {
  const env = readEnv();
  const rl = createInterface({ input: stdin, output: stdout });

  console.log("\nJobPilot setup\n");

  let databaseUrl = null;
  while (!databaseUrl) {
    const keep = env.DATABASE_URL ? " (press Enter to keep the current one)" : "";
    const answer = (await rl.question(`Paste your database connection string${keep}:\n> `)).trim();
    if (!answer && env.DATABASE_URL) databaseUrl = env.DATABASE_URL;
    else databaseUrl = cleanDatabaseUrl(answer);
    if (!databaseUrl) console.log("That doesn't look right. It should start with postgresql://\n");
  }

  const keyHint = env.ANTHROPIC_API_KEY ? "press Enter to keep the current one" : "press Enter to skip";
  const apiKey =
    (await rl.question(`\nPaste your Anthropic API key for AI resume reading (${keyHint}):\n> `)).trim() ||
    env.ANTHROPIC_API_KEY ||
    "";
  rl.close();

  const next = {
    ...env,
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: env.SESSION_SECRET || randomBytes(32).toString("base64url"),
    APP_URL: env.APP_URL || "http://localhost:3000",
    ANTHROPIC_API_KEY: apiKey,
  };
  writeFileSync(
    ENV_FILE,
    Object.entries(next)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n",
  );
  console.log(`\nSaved your settings in ${ENV_FILE}.`);

  console.log("Creating the database tables...\n");
  const result = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (result.status !== 0) {
    console.error(
      "\nCouldn't set up the database. Check that the connection string is complete and run npm run setup again.",
    );
    process.exit(1);
  }

  console.log("\nAll set. Start the app with:\n\n  npm run dev\n\nthen open http://localhost:3000 in your browser.\n");
}

if (process.argv[1]?.endsWith("setup.mjs")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
