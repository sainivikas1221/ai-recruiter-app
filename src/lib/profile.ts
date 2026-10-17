import { z } from "zod";

export const JOB_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
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
    salaryCurrency: p.salary?.currency ?? null,
    salaryMin: p.salary ? Math.round(p.salary.min) : null,
    salaryTarget: p.salary ? Math.round(p.salary.target) : null,
    yearsExperience: p.yearsExperience === null ? null : Math.round(p.yearsExperience),
  };
}
