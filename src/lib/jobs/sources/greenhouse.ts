import type { FetchJson, NormalizedJob } from "../types";
import { htmlToText, toDate, workModeFrom } from "../text";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  content?: string;
};

/** Public job board API: https://developers.greenhouse.io/job-board.html */
export async function fetchGreenhouse(
  board: string,
  company: string,
  fetchJson: FetchJson,
): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
  )) as { jobs?: GreenhouseJob[] };

  return (data.jobs ?? []).map((j) => {
    const location = j.location?.name ?? null;
    const description = htmlToText(j.content);
    return {
      source: "greenhouse",
      externalId: `${board}:${j.id}`,
      company,
      title: j.title.trim(),
      location,
      workMode: workModeFrom(location) ?? workModeFrom(j.title),
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      url: j.absolute_url,
      description,
      postedAt: toDate(j.first_published ?? j.updated_at),
      applyViaAts: true,
    };
  });
}
