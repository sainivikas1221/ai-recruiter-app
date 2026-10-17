"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/user";
import { savePreferences } from "@/lib/preferences";
import { JOB_TYPES, WORK_MODES } from "@/lib/profile";

export type PreferencesState = { error?: string } | undefined;

const list = z
  .string()
  .default("")
  .transform((s) =>
    [...new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 25),
  );

const money = z
  .string()
  .default("")
  .transform((s) => s.replace(/[^\d]/g, ""))
  .transform((s) => (s ? Number(s) : null))
  .refine((n) => n === null || (n > 0 && n < 2_000_000_000), "Enter a realistic salary");

const PreferencesSchema = z.object({
  roles: list.refine((r) => r.length > 0, "Add at least one role"),
  skills: list,
  locations: list,
  jobTypes: z.array(z.enum(JOB_TYPES)).min(1, "Pick at least one job type"),
  workModes: z.array(z.enum(WORK_MODES)).min(1, "Pick at least one place to work"),
  salaryCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .transform((s) => (s ? s : null))
    .refine((s) => s === null || /^[A-Z]{3}$/.test(s), "Use a 3-letter currency code like USD"),
  salaryMin: money,
  salaryTarget: money,
  yearsExperience: z
    .string()
    .default("")
    .transform((s) => (s.trim() ? Math.round(Number(s)) : null))
    .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n <= 60), "Enter years as a number"),
});

export async function updatePreferences(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const user = await requireUser();
  const parsed = PreferencesSchema.safeParse({
    roles: formData.get("roles") ?? "",
    skills: formData.get("skills") ?? "",
    locations: formData.get("locations") ?? "",
    jobTypes: formData.getAll("jobTypes"),
    workModes: formData.getAll("workModes"),
    salaryCurrency: formData.get("salaryCurrency") ?? "",
    salaryMin: formData.get("salaryMin") ?? "",
    salaryTarget: formData.get("salaryTarget") ?? "",
    yearsExperience: formData.get("yearsExperience") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const prefs = parsed.data;
  if (prefs.salaryMin && prefs.salaryTarget && prefs.salaryTarget < prefs.salaryMin) {
    return { error: "Target salary should be at least your minimum." };
  }
  if ((prefs.salaryMin || prefs.salaryTarget) && !prefs.salaryCurrency) {
    return { error: "Add a currency for your salary, like USD or INR." };
  }
  await savePreferences(user.id, prefs);
  redirect("/jobs");
}
