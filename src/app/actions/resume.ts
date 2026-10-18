"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/user";
import { extractProfile } from "@/lib/ai/extract";
import { preferencesFromProfile } from "@/lib/profile";
import { savePreferences } from "@/lib/preferences";
import { extractResumeText, ResumeParseError, resumeKind } from "@/lib/resume/parse";

export type UploadState = { error?: string } | undefined;

export async function uploadResume(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await requireUser();
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or DOCX file." };

  let text: string;
  try {
    text = await extractResumeText(file);
  } catch (err) {
    if (err instanceof ResumeParseError) return { error: err.message };
    throw err;
  }

  let extraction;
  try {
    extraction = await extractProfile(text);
  } catch (err) {
    console.error("Resume extraction failed", err);
    return { error: "Our AI couldn't read your resume just now. Please try again in a minute." };
  }

  await db.insert(schema.resumes).values({
    userId: user.id,
    fileName: file.name.slice(0, 200),
    mimeType: resumeKind(file) === "pdf" ? "application/pdf" : file.type || "application/octet-stream",
    sizeBytes: file.size,
    text,
    extracted: extraction.profile,
    extractedBy: extraction.by,
  });

  // Suggested preferences replace the old ones; the next screen lets the user edit them.
  await savePreferences(user.id, preferencesFromProfile(extraction.profile));
  if (extraction.profile.fullName) {
    await db
      .update(schema.users)
      .set({ name: extraction.profile.fullName })
      .where(and(eq(schema.users.id, user.id), isNull(schema.users.name)));
  }
  revalidatePath("/", "layout");
  redirect("/preferences?from=resume");
}
