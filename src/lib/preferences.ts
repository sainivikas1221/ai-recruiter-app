import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isLinkedInExport } from "@/lib/ai/heuristic";
import type { JobType, Preferences, WorkMode } from "@/lib/profile";

export async function getPreferences(userId: string): Promise<Preferences | null> {
  const [row] = await db.select().from(schema.preferences).where(eq(schema.preferences.userId, userId));
  if (!row) return null;
  return {
    roles: row.roles,
    skills: row.skills,
    jobTypes: row.jobTypes as JobType[],
    workModes: row.workModes as WorkMode[],
    locations: row.locations,
    salaryCurrency: row.salaryCurrency,
    salaryMin: row.salaryMin,
    salaryTarget: row.salaryTarget,
    yearsExperience: row.yearsExperience,
  };
}

export async function savePreferences(userId: string, prefs: Preferences) {
  const values = { ...prefs, userId, updatedAt: new Date() };
  await db
    .insert(schema.preferences)
    .values(values)
    .onConflictDoUpdate({ target: schema.preferences.userId, set: values });
}

export async function getLatestResume(userId: string) {
  const [row] = await db
    .select({
      id: schema.resumes.id,
      fileName: schema.resumes.fileName,
      createdAt: schema.resumes.createdAt,
      extracted: schema.resumes.extracted,
      extractedBy: schema.resumes.extractedBy,
    })
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, userId))
    .orderBy(desc(schema.resumes.createdAt))
    .limit(1);
  return row ?? null;
}

/** The newest resume and the newest LinkedIn profile export the user uploaded, if any. */
export async function getLatestDocuments(userId: string) {
  const rows = await db
    .select({ text: schema.resumes.text })
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, userId))
    .orderBy(desc(schema.resumes.createdAt))
    .limit(20);
  return {
    resume: rows.find((r) => !isLinkedInExport(r.text))?.text ?? null,
    linkedin: rows.find((r) => isLinkedInExport(r.text))?.text ?? null,
  };
}
