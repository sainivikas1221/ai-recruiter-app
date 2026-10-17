import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, parseSalaryText, toDate } from "../text";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

/** Remote jobs API: https://remotive.com/api-documentation (link back to Remotive is required). */
export async function fetchRemotive(search: string, fetchJson: FetchJson): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=100`,
  )) as { jobs?: RemotiveJob[] };

  return (data.jobs ?? []).map((j) => {
    const salary = parseSalaryText(j.salary);
    return {
      source: "remotive",
      externalId: String(j.id),
      company: j.company_name,
      title: j.title.trim(),
      location: j.candidate_required_location || "Remote",
      workMode: "remote",
      employmentType: j.job_type ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      url: j.url,
      description: htmlToText(j.description),
      postedAt: toDate(j.publication_date),
      applyViaAts: false,
    };
  });
}
