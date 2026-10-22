import type { FetchJson, NormalizedJob } from "../types";
import { toDate, workModeFrom } from "../text";

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  descriptionPlain?: string;
  workplaceType?: "remote" | "hybrid" | "on-site" | "onsite" | "unspecified";
  categories?: { location?: string; commitment?: string; team?: string };
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
};

const INTERVAL_FACTOR: Record<string, number> = {
  "per-year-salary": 1,
  "per-month-salary": 12,
  "per-week-salary": 52,
  "per-day-wage": 260,
  "per-hour-wage": 2080,
};

/** Public postings API: https://github.com/lever/postings-api */
export async function fetchLever(
  site: string,
  company: string,
  fetchJson: FetchJson,
): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`,
  )) as LeverPosting[];

  return (Array.isArray(data) ? data : []).map((p) => {
    const location = p.categories?.location ?? null;
    const mode =
      p.workplaceType === "remote"
        ? "remote"
        : p.workplaceType === "hybrid"
          ? "hybrid"
          : p.workplaceType === "on-site" || p.workplaceType === "onsite"
            ? "onsite"
            : workModeFrom(location);
    const factor = INTERVAL_FACTOR[p.salaryRange?.interval ?? "per-year-salary"] ?? 1;
    return {
      source: "lever",
      externalId: `${site}:${p.id}`,
      company,
      title: p.text.trim(),
      location,
      workMode: mode,
      employmentType: p.categories?.commitment ?? null,
      salaryMin: p.salaryRange?.min ? Math.round(p.salaryRange.min * factor) : null,
      salaryMax: p.salaryRange?.max ? Math.round(p.salaryRange.max * factor) : null,
      salaryCurrency: p.salaryRange?.currency ?? null,
      url: p.hostedUrl,
      description: p.descriptionPlain?.slice(0, 8000) ?? null,
      postedAt: toDate(p.createdAt),
      applyViaAts: true,
    };
  });
}
