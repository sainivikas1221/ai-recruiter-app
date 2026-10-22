import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, toDate, workModeFrom } from "../text";

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  isRemote?: boolean;
  workplaceType?: "Remote" | "Hybrid" | "OnSite" | null;
  employmentType?: string;
  jobUrl: string;
  publishedAt?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  isListed?: boolean;
  compensation?: {
    summaryComponents?: {
      compensationType?: string;
      interval?: string;
      currencyCode?: string;
      minValue?: number | null;
      maxValue?: number | null;
    }[];
  };
};

/** Public job posting API: https://developers.ashbyhq.com/docs/public-job-posting-api */
export async function fetchAshby(
  board: string,
  company: string,
  fetchJson: FetchJson,
): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
  )) as { jobs?: AshbyJob[] };

  return (data.jobs ?? [])
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const salary = j.compensation?.summaryComponents?.find(
        (c) => c.compensationType === "Salary" && c.interval === "1 YEAR",
      );
      const mode =
        j.workplaceType === "Remote" || j.isRemote
          ? "remote"
          : j.workplaceType === "Hybrid"
            ? "hybrid"
            : j.workplaceType === "OnSite"
              ? "onsite"
              : workModeFrom(j.location);
      return {
        source: "ashby",
        externalId: `${board}:${j.id}`,
        company,
        title: j.title.trim(),
        location: j.location ?? null,
        workMode: mode,
        employmentType: j.employmentType ?? null,
        salaryMin: salary?.minValue ?? null,
        salaryMax: salary?.maxValue ?? null,
        salaryCurrency: salary?.currencyCode ?? null,
        url: j.jobUrl,
        description: j.descriptionPlain?.slice(0, 8000) ?? htmlToText(j.descriptionHtml),
        postedAt: toDate(j.publishedAt),
        applyViaAts: true,
      };
    });
}
