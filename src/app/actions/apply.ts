"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/user";
import { saveApplicantDetails } from "@/lib/apply/details";
import { canAutoApply } from "@/lib/apply/eligibility";
import { kickQueue } from "@/lib/apply/runner";

export type ApplyState = { error?: string } | undefined;

const optional = z
  .string()
  .default("")
  .transform((s) => s.trim() || null);
const yesNo = z
  .string()
  .default("")
  .transform((s) => (s === "yes" ? true : s === "no" ? false : null));
const url = optional.refine((s) => s === null || /^https?:\/\/\S+\.\S+/.test(s), "Links should start with https://");

const DetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Add your first name"),
  lastName: z.string().trim().min(1, "Add your last name"),
  phone: optional.refine((s) => s === null || s.replace(/\D/g, "").length >= 7, "Check your phone number"),
  city: optional,
  linkedinUrl: url,
  websiteUrl: url,
  currentCompany: optional,
  authorizedToWork: yesNo,
  needsSponsorship: yesNo,
  noticePeriod: optional,
  coverNote: optional,
});

const field = (formData: FormData, name: string) => formData.get(name) ?? "";

/** Saves the details, then queues the chosen jobs for JobPilot to apply to. */
export async function confirmApply(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await requireUser();
  const parsed = DetailsSchema.safeParse(Object.fromEntries(Object.keys(DetailsSchema.shape).map((k) => [k, field(formData, k)])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await saveApplicantDetails(user.id, parsed.data);

  const jobIds = [...new Set(formData.getAll("job").map(String))].slice(0, 50);
  if (!jobIds.length) {
    revalidatePath("/applications");
    redirect("/applications?saved=1");
  }
  const jobs = (await db.select().from(schema.jobs).where(inArray(schema.jobs.id, jobIds))).filter(canAutoApply);
  const existing = await db
    .select({ jobId: schema.applications.jobId, status: schema.applications.status })
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, user.id), inArray(schema.applications.jobId, jobIds)));
  const done = new Set(existing.filter((a) => a.status === "submitted" || a.status === "applied").map((a) => a.jobId));

  for (const job of jobs.filter((j) => !done.has(j.id))) {
    const values = {
      userId: user.id,
      jobId: job.id,
      company: job.company,
      title: job.title,
      url: job.url,
      source: job.source,
      appliedBy: "jobpilot" as const,
      status: "queued" as const,
      note: null,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.applications)
      .values(values)
      .onConflictDoUpdate({ target: [schema.applications.userId, schema.applications.jobId], set: values });
  }
  after(() => kickQueue());
  revalidatePath("/", "layout");
  redirect("/applications");
}

async function ownApplication(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.id, id), eq(schema.applications.userId, userId)));
  return row ?? null;
}

/** "Mark as applied by me": records a job the person applied to themselves. */
export async function markApplied(jobId: string) {
  const user = await requireUser();
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));
  if (!job) return;
  const values = {
    userId: user.id,
    jobId,
    company: job.company,
    title: job.title,
    url: job.url,
    source: job.source,
    appliedBy: "user" as const,
    status: "applied" as const,
    note: null,
    updatedAt: new Date(),
  };
  await db
    .insert(schema.applications)
    .values(values)
    .onConflictDoUpdate({ target: [schema.applications.userId, schema.applications.jobId], set: values });
  revalidatePath("/", "layout");
}

/** Undoes "Mark as applied by me". Applications JobPilot made are kept. */
export async function unmarkApplied(jobId: string) {
  const user = await requireUser();
  await db
    .delete(schema.applications)
    .where(
      and(
        eq(schema.applications.userId, user.id),
        eq(schema.applications.jobId, jobId),
        eq(schema.applications.appliedBy, "user"),
      ),
    );
  revalidatePath("/", "layout");
}

/** Adds a job the person applied to somewhere else, so everything is in one list. */
export async function addOwnApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await requireUser();
  const parsed = z
    .object({
      company: z.string().trim().min(1, "Add the company"),
      title: z.string().trim().min(1, "Add the job title"),
      url: z
        .string()
        .trim()
        .refine((s) => s === "" || /^https?:\/\/\S+/.test(s), "Links should start with https://"),
    })
    .safeParse({ company: field(formData, "company"), title: field(formData, "title"), url: field(formData, "url") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.insert(schema.applications).values({
    userId: user.id,
    jobId: `own:${crypto.randomUUID()}`,
    ...parsed.data,
    source: "own",
    appliedBy: "user",
    status: "applied",
  });
  revalidatePath("/applications");
  return {};
}

/** After the person finished a "needs you" or test-mode application themselves. */
export async function markSentMyself(formData: FormData) {
  const user = await requireUser();
  const app = await ownApplication(user.id, String(formData.get("id") ?? ""));
  if (!app) return;
  await db
    .update(schema.applications)
    .set({ status: "applied", appliedBy: "user", note: null, updatedAt: new Date() })
    .where(eq(schema.applications.id, app.id));
  revalidatePath("/", "layout");
}

export async function retryApplication(formData: FormData) {
  const user = await requireUser();
  const app = await ownApplication(user.id, String(formData.get("id") ?? ""));
  if (!app || app.appliedBy !== "jobpilot") return;
  await db
    .update(schema.applications)
    .set({ status: "queued", note: null, updatedAt: new Date() })
    .where(eq(schema.applications.id, app.id));
  after(() => kickQueue());
  revalidatePath("/applications");
}

export async function removeApplication(formData: FormData) {
  const user = await requireUser();
  const app = await ownApplication(user.id, String(formData.get("id") ?? ""));
  if (!app || app.status === "filling") return;
  await db.delete(schema.applications).where(eq(schema.applications.id, app.id));
  revalidatePath("/", "layout");
}
