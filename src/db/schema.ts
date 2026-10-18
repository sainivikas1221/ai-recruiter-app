import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import type { ExtractedProfile } from "@/lib/profile";

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
    // Only the extracted text is kept; the original file is not stored.
    text: text("text").notNull(),
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
