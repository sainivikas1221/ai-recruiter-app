import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, toDate } from "../text";

type JobicyJob = {
  id: number | string;
  url: string;
  jobTitle: string;
  companyName?: string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v) || null);

/**
 * Remote jobs API, no key: https://github.com/Jobicy/remote-jobs-api
 * Its terms: keep the Jobicy job URL, credit Jobicy, and poll at most hourly (we cache for 6 hours).
 */
export async function fetchJobicy(search: string, fetchJson: FetchJson): Promise<NormalizedJob[]> {
  const tag = search.trim().slice(0, 50);
  if (tag.length < 3) return [];
  const data = (await fetchJson(
    `https://jobicy.com/api/v2/remote-jobs?count=100&tag=${encodeURIComponent(tag)}`,
  )) as { jobs?: JobicyJob[] };

  return (data.jobs ?? [])
    .filter((j) => j.url && j.jobTitle)
    .map((j) => {
      const yearly = !j.salaryPeriod || /year|annual/i.test(j.salaryPeriod);
      const min = yearly ? num(j.salaryMin) : null;
      const max = yearly ? num(j.salaryMax) : null;
      return {
        source: "jobicy",
        externalId: String(j.id),
        company: j.companyName?.trim() || "Unknown company",
        title: htmlToText(j.jobTitle) ?? j.jobTitle.trim(),
        location: j.jobGeo?.trim() || "Worldwide",
        workMode: "remote",
        employmentType: Array.isArray(j.jobType) ? j.jobType.join(", ") || null : (j.jobType ?? null),
        salaryMin: min,
        salaryMax: max,
        salaryCurrency: min || max ? (j.salaryCurrency ?? null) : null,
        url: j.url,
        description: htmlToText(j.jobDescription ?? j.jobExcerpt),
        postedAt: toDate(j.pubDate),
        applyViaAts: false,
      };
    });
}
