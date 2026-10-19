import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, toDate } from "../text";

type HimalayasJob = {
  guid: string;
  title: string;
  companyName?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  currency?: string | null;
  locationRestrictions?: (string | { name?: string })[];
  description?: string;
  excerpt?: string;
  pubDate?: string | number;
  applicationLink: string;
};

/**
 * Remote jobs API, no key: https://himalayas.app/docs/remote-jobs-api
 * Its terms ask that Apply uses applicationLink and that Himalayas is credited as the source.
 */
export async function fetchHimalayas(search: string, fetchJson: FetchJson): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(search)}&sort=recent`,
  )) as { jobs?: HimalayasJob[] };

  return (data.jobs ?? [])
    .filter((j) => j.guid && j.title && j.applicationLink)
    .map((j) => {
      const places = (j.locationRestrictions ?? [])
        .map((p) => (typeof p === "string" ? p : p.name))
        .filter(Boolean);
      const yearly = !j.salaryPeriod || /year|annual/i.test(j.salaryPeriod);
      // The docs give pubDate both as ISO text and as a Unix time; accept seconds or milliseconds.
      const posted =
        typeof j.pubDate === "number" ? new Date(j.pubDate < 1e12 ? j.pubDate * 1000 : j.pubDate) : toDate(j.pubDate);
      return {
        source: "himalayas",
        externalId: j.guid,
        company: j.companyName?.trim() || "Unknown company",
        title: j.title.trim(),
        location: places.length ? places.join(", ") : "Worldwide",
        workMode: "remote",
        employmentType: j.employmentType ?? null,
        salaryMin: yearly && j.minSalary ? Math.round(j.minSalary) : null,
        salaryMax: yearly && j.maxSalary ? Math.round(j.maxSalary) : null,
        salaryCurrency: yearly && (j.minSalary || j.maxSalary) ? (j.currency ?? null) : null,
        url: j.applicationLink,
        description: htmlToText(j.description ?? j.excerpt),
        postedAt: posted && !Number.isNaN(posted.getTime()) ? posted : null,
        applyViaAts: false,
      };
    });
}
