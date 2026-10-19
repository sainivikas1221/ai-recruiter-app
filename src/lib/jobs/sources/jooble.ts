import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, parseSalaryText, toDate, workModeFrom } from "../text";

type JoobleJob = {
  id: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
};

export function joobleEnabled() {
  return Boolean(process.env.JOOBLE_API_KEY);
}

/** Aggregator API with a free key covering ~70 countries, India included: https://jooble.org/api/about */
export async function fetchJooble(
  search: string,
  where: string | null,
  fetchJson: FetchJson,
): Promise<NormalizedJob[]> {
  const data = (await fetchJson(`https://jooble.org/api/${encodeURIComponent(process.env.JOOBLE_API_KEY ?? "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: search, location: where ?? "", page: "1" }),
  })) as { jobs?: JoobleJob[] };

  return (data.jobs ?? [])
    .filter((j) => j.link && j.title)
    .map((j) => {
      const description = htmlToText(j.snippet);
      const salary = parseSalaryText(j.salary);
      return {
        source: "jooble",
        externalId: String(j.id),
        company: j.company?.trim() || "Unknown company",
        title: htmlToText(j.title) ?? j.title.trim(),
        location: j.location?.trim() || null,
        workMode: workModeFrom(`${j.title} ${j.location ?? ""} ${description ?? ""}`),
        employmentType: j.type || null,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryCurrency: salary.currency,
        url: j.link,
        description,
        postedAt: toDate(j.updated),
        applyViaAts: false,
      };
    });
}
