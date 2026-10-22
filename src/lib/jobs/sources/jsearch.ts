import type { FetchJson, NormalizedJob } from "../types";
import { toDate, workModeFrom } from "../text";

type JSearchJob = {
  job_id: string;
  employer_name?: string;
  job_publisher?: string;
  job_title: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_description?: string;
  job_is_remote?: boolean;
  job_employment_type?: string;
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_location?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
};

const PERIOD: Record<string, number> = { YEAR: 1, MONTH: 12, WEEK: 52, DAY: 260, HOUR: 2080 };

export function jsearchEnabled() {
  return Boolean(process.env.JSEARCH_API_KEY);
}

/**
 * Google for Jobs results through the JSearch API (https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch).
 * Google lists jobs from Naukri, LinkedIn, Indeed, Shine, company sites and more, so this is the widest
 * source we have. We only show these jobs and link to them; the user applies on the site that posted it.
 */
export async function fetchJSearch(
  search: string,
  where: string | null,
  country: string,
  fetchJson: FetchJson,
): Promise<NormalizedJob[]> {
  const params = new URLSearchParams({
    query: where ? `${search} jobs in ${where}` : `${search} jobs`,
    // 10 jobs per page, each page one request of the free monthly allowance.
    num_pages: "2",
    country,
    date_posted: "month",
  });
  const host = process.env.JSEARCH_API_HOST ?? "jsearch.p.rapidapi.com";
  // JSearch v5 replaced /search with /search-v2, which nests the jobs under data.jobs.
  const res = (await fetchJson(`https://${host}/search-v2?${params}`, {
    headers: { "X-RapidAPI-Key": process.env.JSEARCH_API_KEY ?? "", "X-RapidAPI-Host": host },
    // JSearch averages ~10 seconds and often takes longer when other sources are searched at once.
    timeoutMs: 45000,
  })) as { data?: JSearchJob[] | { jobs?: JSearchJob[] } };
  const jobs = Array.isArray(res.data) ? res.data : (res.data?.jobs ?? []);

  return jobs
    .filter((j) => j.job_id && j.job_title && (j.job_apply_link || j.job_google_link))
    .map((j) => {
      const location =
        j.job_location || [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || null;
      const factor = PERIOD[(j.job_salary_period ?? "").toUpperCase()] ?? null;
      const pay = (n: number | null | undefined) => (factor && n ? Math.round(n * factor) : null);
      const company = j.employer_name?.trim() || "Unknown company";
      return {
        source: "jsearch",
        externalId: j.job_id,
        company,
        title: j.job_title.trim(),
        location: j.job_is_remote ? (location ? `Remote, ${location}` : "Remote") : location,
        workMode: j.job_is_remote ? "remote" : workModeFrom(`${j.job_title} ${location ?? ""}`),
        employmentType: j.job_employment_type ?? null,
        salaryMin: pay(j.job_min_salary),
        salaryMax: pay(j.job_max_salary),
        salaryCurrency: factor && j.job_salary_currency ? j.job_salary_currency : null,
        url: (j.job_apply_link || j.job_google_link)!,
        description: j.job_description?.slice(0, 8000) ?? null,
        postedAt:
          toDate(j.job_posted_at_datetime_utc) ??
          (j.job_posted_at_timestamp ? new Date(j.job_posted_at_timestamp * 1000) : null),
        applyViaAts: false,
      };
    });
}
