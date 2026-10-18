// Starts JobPilot on this computer: builds it the first time, starts the server
// and opens the browser. "Start JobPilot.bat" (Windows) and
// "Start JobPilot.command" (Mac) run this after making sure Node.js is installed.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir, platform } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const NEXT = path.join("node_modules", "next", "dist", "bin", "next");
const DATA_DIR = process.env.JOBPILOT_DATA_DIR || path.join(homedir(), ".jobpilot");
const SETTINGS = path.join(DATA_DIR, "settings.json");

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("\nSomething went wrong. Copy the text above and send it to Claude in your project.");
    process.exit(result.status ?? 1);
  }
}

function freePort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(freePort(port + 1)));
    server.listen(port, () => server.close(() => resolve(port)));
  });
}

function openBrowser(url) {
  const os = platform();
  const [cmd, args] =
    os === "win32" ? ["cmd", ["/c", "start", "", url]] : os === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}

async function waitUntilUp(url) {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(url);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

async function settings() {
  mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(SETTINGS)) return JSON.parse(readFileSync(SETTINGS, "utf8"));

  // Asked once; the answer is kept for later starts and new downloads.
  console.log("\nOptional: JobPilot can use Claude to read resumes much better.");
  console.log("If you have an Anthropic API key (from console.anthropic.com), paste it below.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const key = (await rl.question("API key (or just press Enter to skip): ")).trim();
  rl.close();
  const saved = { anthropicApiKey: key };
  writeFileSync(SETTINGS, JSON.stringify(saved, null, 2), { mode: 0o600 });
  return saved;
}

async function main() {
  console.log("\n=== JobPilot ===\n");
  const { anthropicApiKey } = await settings();
  if (anthropicApiKey && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = anthropicApiKey;

  if (!existsSync(path.join(".next", "BUILD_ID"))) {
    console.log("\nPreparing the app. This happens once and takes a minute or two...\n");
    run([NEXT, "build"]);
  }

  const port = await freePort(Number(process.env.PORT) || 3000);
  const url = `http://localhost:${port}`;
  const server = spawn(process.execPath, [NEXT, "start", "-p", String(port)], { stdio: "inherit" });
  server.on("exit", (code) => process.exit(code ?? 0));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));

  if (await waitUntilUp(url)) {
    console.log(`\nJobPilot is running at ${url}`);
    console.log("Keep this window open while you use it. Close it (or press Ctrl+C) to stop.\n");
    if (!process.env.JOBPILOT_NO_BROWSER) openBrowser(url);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
