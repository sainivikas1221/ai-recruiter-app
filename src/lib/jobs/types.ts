import type { WorkMode } from "@/lib/profile";

/** A job posting in the shape every source is converted to. */
export type NormalizedJob = {
  source: string;
  externalId: string;
  company: string;
  title: string;
  location: string | null;
  workMode: WorkMode | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  url: string;
  description: string | null;
  postedAt: Date | null;
  applyViaAts: boolean;
};

export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type FetchJson = (url: string, init?: FetchInit) => Promise<unknown>;
