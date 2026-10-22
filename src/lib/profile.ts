import { z } from "zod";
import { currencyFor } from "@/lib/jobs/geo";

export const JOB_TYPES = ["full_time", "part_time", "contract", "freelance", "internship", "temporary"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance (per project)",
  internship: "Internship",
  temporary: "Temporary",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

/** What the AI reads out of a resume. Every field is a suggestion the user can edit. */
export const ExtractedProfileSchema = z.object({
  fullName: z.string().nullable(),
  headline: z
    .string()
    .describe("One line describing the candidate, e.g. 'Data analyst with 5 years in fintech'"),
  roles: z
    .array(z.string())
    .describe("3 to 5 job titles this person is a strong fit for next, most likely first"),
  skills: z.array(z.string()).describe("Up to 20 concrete skills and tools, most important first"),
  yearsExperience: z.number().nullable().describe("Total years of professional experience"),
  jobTypes: z.array(z.enum(JOB_TYPES)).describe("Employment types that fit; usually full_time"),
  workModes: z
    .array(z.enum(WORK_MODES))
    .describe("Work arrangements that fit; include remote unless the resume suggests otherwise"),
  locations: z
    .array(z.string())
    .describe("Cities or countries the person is based in or has said they want to work in"),
  currentCompany: z.string().nullable().describe("The employer of the person's current or most recent job"),
  coverNote: z
    .string()
    .describe(
      "A ready-to-send cover note in the person's own voice, 90 to 130 words, first person, plain text. " +
        "Built only from the resume: who they are, two or three concrete strengths or results, and what they want next. " +
        "No placeholders, no company name, no greeting or sign-off.",
    ),
  salary: z
    .object({
      currency: z.string().describe("ISO 4217 code for where the person is based, e.g. USD, INR, EUR"),
      min: z.number().describe("Lowest acceptable annual base salary, in whole currency units"),
      target: z.number().describe("Target annual base salary, in whole currency units"),
      isEstimate: z
        .boolean()
        .describe("True when the resume does not state expectations and this is a market estimate"),
    })
    .nullable(),
});

export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

export type Preferences = {
  roles: string[];
  skills: string[];
  jobTypes: JobType[];
  workModes: WorkMode[];
  locations: string[];
  salaryCurrency: string | null;
  salaryMin: number | null;
  salaryTarget: number | null;
  yearsExperience: number | null;
};

export function preferencesFromProfile(p: ExtractedProfile): Preferences {
  return {
    roles: p.roles.slice(0, 5),
    skills: p.skills.slice(0, 20),
    jobTypes: p.jobTypes.length ? p.jobTypes : ["full_time"],
    workModes: p.workModes.length ? p.workModes : ["remote"],
    locations: p.locations,
    salaryCurrency: p.salary?.currency ?? (p.locations[0] ? currencyFor(p.locations[0]) : null),
    salaryMin: p.salary ? Math.round(p.salary.min) : null,
    salaryTarget: p.salary ? Math.round(p.salary.target) : null,
    yearsExperience: p.yearsExperience === null ? null : Math.round(p.yearsExperience),
  };
}

/**
 * Combines what was read from two documents about the same person (a resume and a LinkedIn
 * profile). The first one wins where they disagree on a single value; lists are joined.
 */
export function mergeProfiles(first: ExtractedProfile, second: ExtractedProfile): ExtractedProfile {
  const join = <T,>(a: T[], b: T[], max: number) => {
    const seen = new Set<string>();
    return [...a, ...b]
      .filter((x) => {
        const k = String(x).toLowerCase();
        return !seen.has(k) && !!seen.add(k);
      })
      .slice(0, max);
  };
  const years = [first.yearsExperience, second.yearsExperience].filter((y): y is number => y !== null);
  return {
    fullName: first.fullName ?? second.fullName,
    headline: first.headline !== "Professional" ? first.headline : second.headline,
    roles: join(first.roles, second.roles, 5),
    skills: join(first.skills, second.skills, 20),
    yearsExperience: years.length ? Math.max(...years) : null,
    jobTypes: join(first.jobTypes, second.jobTypes, 5),
    workModes: join(first.workModes, second.workModes, 3),
    locations: join(first.locations, second.locations, 5),
    currentCompany: first.currentCompany ?? second.currentCompany ?? null,
    coverNote: first.coverNote || second.coverNote || "",
    salary: first.salary && !first.salary.isEstimate ? first.salary : (second.salary ?? first.salary),
  };
}
