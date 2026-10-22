import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { ExtractedProfile } from "@/lib/profile";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Null for accounts that only sign in with Google.
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  linkedinId: text("linkedin_id").unique(),
  // Everyone starts on a free trial; billing arrives in a later phase.
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    text: text("text").notNull(),
    // The original file, attached to applications the user asks JobPilot to send.
    file: bytea("file"),
    // What the AI pulled out of the resume, before the user edits anything.
    extracted: jsonb("extracted").$type<ExtractedProfile>(),
    extractedBy: text("extracted_by").$type<"claude" | "heuristic">(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resumes_user_idx").on(t.userId)],
);

export const preferences = pgTable("preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  roles: text("roles").array().notNull().default([]),
  skills: text("skills").array().notNull().default([]),
  jobTypes: text("job_types").array().notNull().default([]),
  workModes: text("work_modes").array().notNull().default([]),
  locations: text("locations").array().notNull().default([]),
  salaryCurrency: text("salary_currency"),
  salaryMin: integer("salary_min"),
  salaryTarget: integer("salary_target"),
  yearsExperience: integer("years_experience"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    // `${source}:${externalId}` so the same posting is stored once per source.
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    workMode: text("work_mode").$type<"remote" | "hybrid" | "onsite">(),
    employmentType: text("employment_type"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    url: text("url").notNull(),
    description: text("description"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    // Whether the posting's application form is a candidate for auto-apply later.
    applyViaAts: boolean("apply_via_ats").notNull().default(false),
  },
  (t) => [index("jobs_fetched_idx").on(t.fetchedAt), index("jobs_source_idx").on(t.source)],
);

export const sourceRuns = pgTable("source_runs", {
  // One row per feed (e.g. "greenhouse:stripe" or "remotive:data analyst").
  key: text("key").primaryKey(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull(),
  ok: boolean("ok").notNull(),
  jobCount: integer("job_count").notNull().default(0),
  error: text("error"),
});

/** What application forms ask for beyond the resume. Filled once, reused for every application. */
export const applicantDetails = pgTable("applicant_details", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  city: text("city"),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  currentCompany: text("current_company"),
  // null = not answered, so forms asking this are left for the user.
  authorizedToWork: boolean("authorized_to_work"),
  needsSponsorship: boolean("needs_sponsorship"),
  noticePeriod: text("notice_period"),
  coverNote: text("cover_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const APPLICATION_STATUSES = [
  "queued", // waiting for JobPilot to fill the form
  "filling",
  "ready", // test mode: form filled, not sent
  "submitted",
  "needs_you", // a CAPTCHA, a question we can't answer, or a form we don't understand
  "failed",
  "applied", // the user applied themselves
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("job_id").notNull(),
    // A copy of the posting, so the record survives the job being taken down.
    company: text("company").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    source: text("source").notNull(),
    appliedBy: text("applied_by").$type<"jobpilot" | "user">().notNull(),
    status: text("status").$type<ApplicationStatus>().notNull(),
    // Plain-language explanation of the status, e.g. which question needs an answer.
    note: text("note"),
    // The cover letter written for this job, as the person approved it.
    coverLetter: text("cover_letter"),
    // What the filled form looked like, for the user to check.
    screenshot: bytea("screenshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("applications_user_job_idx").on(t.userId, t.jobId), index("applications_status_idx").on(t.status)],
);

/** One-time links for setting a new password. Only a hash of the token is stored. */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("password_resets_token_hash_idx").on(t.tokenHash), index("password_resets_user_idx").on(t.userId)],
);
