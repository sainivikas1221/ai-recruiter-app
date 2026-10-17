import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, toDate } from "../text";

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  job_types?: string[];
  location?: string;
  created_at?: number;
};

/** Free job board API (mostly Europe): https://www.arbeitnow.com/blog/job-board-api */
export async function fetchArbeitnow(fetchJson: FetchJson): Promise<NormalizedJob[]> {
  const data = (await fetchJson("https://www.arbeitnow.com/api/job-board-api")) as {
    data?: ArbeitnowJob[];
  };

  return (data.data ?? []).map((j) => ({
    source: "arbeitnow",
    externalId: j.slug,
    company: j.company_name,
    title: j.title.trim(),
    location: j.location ?? null,
    workMode: j.remote ? "remote" : null,
    employmentType: j.job_types?.[0] ?? null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    url: j.url,
    description: htmlToText(j.description),
    postedAt: j.created_at ? new Date(j.created_at * 1000) : toDate(null),
    applyViaAts: false,
  }));
}
