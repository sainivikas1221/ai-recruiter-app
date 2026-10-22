import "server-only";
import { and, asc, eq, lt } from "drizzle-orm";
import { chromium, type Browser } from "playwright-core";
import { db, schema } from "@/db";
import { coverLetterFor } from "@/lib/ai/cover";
import { CREDITS_PER_APPLICATION, chargeForApplication, getCredits } from "@/lib/credits";
import { getPreferences } from "@/lib/preferences";
import { coverProfile, getApplicantDetails, getResumeFile } from "./details";
import { applicationFormUrl } from "./eligibility";
import { fillApplication, type FillResult } from "./fill";

/** Real submissions only when the owner turns them on; otherwise forms are filled and left unsent. */
export function submitEnabled() {
  return process.env.AUTO_APPLY_SUBMIT === "1";
}

/** A browser on this machine: AUTO_APPLY_BROWSER, else installed Chrome or Edge. */
async function launchBrowser(): Promise<Browser | null> {
  const tries: Parameters<typeof chromium.launch>[0][] = [];
  if (process.env.AUTO_APPLY_BROWSER) tries.push({ executablePath: process.env.AUTO_APPLY_BROWSER });
  tries.push({ channel: "chrome" }, { channel: "msedge" });
  for (const opts of tries) {
    try {
      return await chromium.launch({ headless: true, ...opts });
    } catch {
      // Try the next browser.
    }
  }
  return null;
}

async function update(id: string, result: Omit<FillResult, "screenshot"> & { screenshot?: Buffer | null }) {
  await db
    .update(schema.applications)
    .set({
      status: result.status,
      note: result.note,
      ...(result.screenshot ? { screenshot: new Uint8Array(result.screenshot) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.applications.id, id));
}

async function applyOne(browser: Browser, app: typeof schema.applications.$inferSelect): Promise<FillResult> {
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, app.jobId));
  const url = job && applicationFormUrl(job);
  if (!url) return { status: "failed", note: "This job's application form isn't one JobPilot can fill.", screenshot: null };

  const [details, prefs, resume, [user]] = await Promise.all([
    getApplicantDetails(app.userId),
    getPreferences(app.userId),
    getResumeFile(app.userId),
    db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, app.userId)),
  ]);
  if (!details) return { status: "needs_you", note: "Add your application details first.", screenshot: null };
  // The letter approved on the review page; written now for applications queued without one.
  const coverLetter =
    app.coverLetter ?? (await coverProfile(app.userId, details).then((c) => coverLetterFor(job, c.profile, c.resumeText)));

  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  try {
    const page = await context.newPage();
    return await fillApplication(
      page,
      url,
      {
        details,
        email: user.email,
        yearsExperience: prefs?.yearsExperience ?? null,
        salary:
          prefs?.salaryCurrency && (prefs.salaryTarget ?? prefs.salaryMin)
            ? { currency: prefs.salaryCurrency, amount: (prefs.salaryTarget ?? prefs.salaryMin)! }
            : null,
        coverLetter,
      },
      resume,
      submitEnabled(),
    );
  } finally {
    await context.close();
  }
}

export const OUT_OF_CREDITS =
  "You're out of credits. Buy more credits, then press Try again. No credits were used for this job.";

/** Works through queued applications one at a time. */
async function processQueue() {
  // Applications left half-done by a restart go back in the queue.
  await db
    .update(schema.applications)
    .set({ status: "queued" })
    .where(and(eq(schema.applications.status, "filling"), lt(schema.applications.updatedAt, new Date(Date.now() - 10 * 60_000))));

  let browser: Browser | null = null;
  try {
    for (;;) {
      const [next] = await db
        .select()
        .from(schema.applications)
        .where(eq(schema.applications.status, "queued"))
        .orderBy(asc(schema.applications.createdAt))
        .limit(1);
      if (!next) return;
      const [claimed] = await db
        .update(schema.applications)
        .set({ status: "filling", updatedAt: new Date() })
        .where(and(eq(schema.applications.id, next.id), eq(schema.applications.status, "queued")))
        .returning({ id: schema.applications.id });
      if (!claimed) continue;

      if (next.creditsCharged === 0 && (await getCredits(next.userId)) < CREDITS_PER_APPLICATION) {
        await update(next.id, { status: "needs_you", note: OUT_OF_CREDITS });
        continue;
      }
      browser ??= await launchBrowser();
      if (!browser) {
        await update(next.id, {
          status: "needs_you",
          note: "Auto-apply needs Google Chrome or Microsoft Edge on the computer running JobPilot. Open the job and apply yourself, or run JobPilot on your computer.",
        });
        continue;
      }
      try {
        const result = await applyOne(browser, next);
        // Credits are only taken when JobPilot filled the form all the way (sent, or ready in test mode).
        if (result.status === "submitted" || result.status === "ready") await chargeForApplication(next);
        await update(next.id, result);
      } catch (err) {
        console.error("Auto-apply failed", err);
        await update(next.id, { status: "failed", note: "Something went wrong while filling the form. You can apply yourself from the job page." });
      }
    }
  } finally {
    await browser?.close();
  }
}

const g = globalThis as unknown as { jobpilotQueue?: Promise<void> | null };

/** Starts working through the queue unless this server is already doing so. */
export function kickQueue() {
  g.jobpilotQueue ??= processQueue()
    .catch((err) => console.error("Auto-apply queue stopped", err))
    .finally(() => {
      g.jobpilotQueue = null;
    });
  return g.jobpilotQueue;
}
