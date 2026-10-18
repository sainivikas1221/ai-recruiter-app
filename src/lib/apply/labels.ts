import type { ApplicationStatus } from "@/db/schema";

export type ApplicationSummary = { status: ApplicationStatus; appliedBy: "jobpilot" | "user" };

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  queued: "Waiting to apply",
  filling: "Filling in the form",
  ready: "Filled in, not sent (test mode)",
  submitted: "Applied",
  needs_you: "Needs you",
  failed: "Couldn't apply",
  applied: "Applied",
};
