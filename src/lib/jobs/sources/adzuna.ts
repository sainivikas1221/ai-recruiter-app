import type { FetchJson, NormalizedJob } from "../types";
import { toDate, workModeFrom } from "../text";

type AdzunaJob = {
  id: string;
  title: string;
  description?: string;
  redirect_url: string;
  created?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_time?: string;
};

const CURRENCY: Record<string, string> = {
  us: "USD", gb: "GBP", in: "INR", ca: "CAD", au: "AUD", de: "EUR", fr: "EUR", nl: "EUR",
  es: "EUR", it: "EUR", at: "EUR", be: "EUR", sg: "SGD", nz: "NZD", za: "ZAR", br: "BRL",
  pl: "PLN", mx: "MXN", ch: "CHF",
};

export function adzunaEnabled() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

/** Aggregator API with a free key: https://developer.adzuna.com */
export async function fetchAdzuna(
  search: string,
  where: string | null,
  country: string,
  fetchJson: FetchJson,
): Promise<NormalizedJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID ?? "",
    app_key: process.env.ADZUNA_APP_KEY ?? "",
    what: search,
    results_per_page: "50",
    "content-type": "application/json",
  });
  if (where) params.set("where", where);
  const data = (await fetchJson(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  )) as { results?: AdzunaJob[] };

  return (data.results ?? []).map((j) => {
    // Adzuna fills in predicted salaries; only show salaries the employer posted.
    const posted = j.salary_is_predicted !== "1";
    const text = `${j.title} ${j.location?.display_name ?? ""} ${j.description ?? ""}`;
    return {
      source: "adzuna",
      externalId: `${country}:${j.id}`,
      company: j.company?.display_name ?? "Unknown company",
      title: j.title.trim(),
      location: j.location?.display_name ?? null,
      workMode: workModeFrom(text),
      employmentType: j.contract_time ?? null,
      salaryMin: posted && j.salary_min ? Math.round(j.salary_min) : null,
      salaryMax: posted && j.salary_max ? Math.round(j.salary_max) : null,
      salaryCurrency: posted ? (CURRENCY[country] ?? null) : null,
      url: j.redirect_url,
      description: j.description ?? null,
      postedAt: toDate(j.created),
      applyViaAts: false,
    };
  });
}
