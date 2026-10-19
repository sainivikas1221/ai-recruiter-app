import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isLinkedInExport } from "@/lib/ai/heuristic";
import type { CurrentUser } from "@/lib/auth/user";
import { getLatestDocuments, getLatestResume, getPreferences } from "@/lib/preferences";
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

/**
 * Saved details, with anything left empty filled in from the user's resume, LinkedIn profile
 * and preferences, so people only check what's there instead of typing it.
 */
export async function detailsOrSuggestion(user: CurrentUser): Promise<{ details: ApplicantDetails; saved: boolean }> {
  const [saved, docs, prefs, resume] = await Promise.all([
    getApplicantDetails(user.id),
    getLatestDocuments(user.id),
    getPreferences(user.id),
    getLatestResume(user.id),
  ]);
  const suggested = suggestDetails({
    name: user.name,
    text: [docs.resume, docs.linkedin].filter(Boolean).join("\n"),
    city: prefs?.locations[0] ?? null,
    currentCompany: resume?.extracted?.currentCompany,
    coverNote: resume?.extracted?.coverNote,
  });
  if (!saved) return { details: suggested, saved: false };
  const filled = { ...saved };
  for (const key of Object.keys(suggested) as (keyof ApplicantDetails)[]) {
    if (filled[key] === null || filled[key] === "") (filled as Record<string, unknown>)[key] = suggested[key];
  }
  // Names saved before credentials were stripped ("Saini, CSM®").
  if (/[,®™]/.test(filled.lastName)) filled.lastName = suggested.lastName || filled.lastName;
  return { details: filled, saved: true };
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
