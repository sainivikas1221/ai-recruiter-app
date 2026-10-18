import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isLinkedInExport } from "@/lib/ai/heuristic";
import type { CurrentUser } from "@/lib/auth/user";
import { getLatestDocuments, getPreferences } from "@/lib/preferences";
import { suggestDetails, type ApplicantDetails } from "./suggest";

export type { ApplicantDetails } from "./suggest";

export async function getApplicantDetails(userId: string): Promise<ApplicantDetails | null> {
  const [row] = await db.select().from(schema.applicantDetails).where(eq(schema.applicantDetails.userId, userId));
  if (!row) return null;
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    city: row.city,
    linkedinUrl: row.linkedinUrl,
    websiteUrl: row.websiteUrl,
    currentCompany: row.currentCompany,
    authorizedToWork: row.authorizedToWork,
    needsSponsorship: row.needsSponsorship,
    noticePeriod: row.noticePeriod,
    coverNote: row.coverNote,
  };
}

/** Saved details, or a first draft read from the user's resume, LinkedIn profile and preferences. */
export async function detailsOrSuggestion(user: CurrentUser): Promise<{ details: ApplicantDetails; saved: boolean }> {
  const saved = await getApplicantDetails(user.id);
  if (saved) return { details: saved, saved: true };
  const [docs, prefs] = await Promise.all([getLatestDocuments(user.id), getPreferences(user.id)]);
  const text = [docs.resume, docs.linkedin].filter(Boolean).join("\n");
  return { details: suggestDetails(user.name, text, prefs?.locations[0] ?? null), saved: false };
}

export async function saveApplicantDetails(userId: string, details: ApplicantDetails) {
  const values = { ...details, userId, updatedAt: new Date() };
  await db
    .insert(schema.applicantDetails)
    .values(values)
    .onConflictDoUpdate({ target: schema.applicantDetails.userId, set: values });
}

/** The file to attach to applications: the resume if there is one, else the LinkedIn profile PDF. */
export async function getResumeFile(userId: string) {
  const rows = await db
    .select({
      fileName: schema.resumes.fileName,
      mimeType: schema.resumes.mimeType,
      file: schema.resumes.file,
      text: schema.resumes.text,
    })
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, userId))
    .orderBy(schema.resumes.createdAt);
  const withFile = rows.filter((r) => r.file).reverse();
  const best = withFile.find((r) => !isLinkedInExport(r.text)) ?? withFile[0];
  if (!best?.file) return null;
  return { name: best.fileName, mimeType: best.mimeType, buffer: Buffer.from(best.file) };
}
