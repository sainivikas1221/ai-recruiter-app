import { describe, expect, it } from "vitest";
import { fetchGreenhouse } from "@/lib/jobs/sources/greenhouse";
import { fetchLever } from "@/lib/jobs/sources/lever";
import { fetchAshby } from "@/lib/jobs/sources/ashby";
import { fetchRemotive } from "@/lib/jobs/sources/remotive";
import { fetchArbeitnow } from "@/lib/jobs/sources/arbeitnow";

// Trimmed copies of each API's documented response shape.
const fixtures: Record<string, unknown> = {
  "https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true": {
    jobs: [
      {
        id: 123,
        title: " Data Analyst ",
        absolute_url: "https://boards.greenhouse.io/acme/jobs/123",
        first_published: "2026-10-10T10:00:00Z",
        location: { name: "Remote, US" },
        content: "&lt;p&gt;SQL and Python&lt;/p&gt;",
      },
    ],
  },
  "https://api.lever.co/v0/postings/globex?mode=json": [
    {
      id: "abc",
      text: "BI Developer",
      hostedUrl: "https://jobs.lever.co/globex/abc",
      createdAt: 1760000000000,
      descriptionPlain: "Tableau",
      workplaceType: "hybrid",
      categories: { location: "Pune", commitment: "Full-time" },
      salaryRange: { min: 5000, max: 7000, currency: "USD", interval: "per-month-salary" },
    },
  ],
  "https://api.ashbyhq.com/posting-api/job-board/initech?includeCompensation=true": {
    jobs: [
      {
        id: "z1",
        title: "Analytics Engineer",
        location: "London",
        workplaceType: "OnSite",
        employmentType: "FullTime",
        jobUrl: "https://jobs.ashbyhq.com/initech/z1",
        publishedAt: "2026-10-01T00:00:00Z",
        descriptionPlain: "dbt",
        isListed: true,
        compensation: {
          summaryComponents: [
            { compensationType: "Salary", interval: "1 YEAR", currencyCode: "GBP", minValue: 70000, maxValue: 90000 },
          ],
        },
      },
      { id: "hidden", title: "Hidden", jobUrl: "x", isListed: false },
    ],
  },
  "https://remotive.com/api/remote-jobs?search=data%20analyst&limit=100": {
    jobs: [
      {
        id: 7,
        url: "https://remotive.com/remote-jobs/data/7",
        title: "Data Analyst",
        company_name: "Umbrella",
        job_type: "full_time",
        publication_date: "2026-10-15T08:00:00",
        candidate_required_location: "Worldwide",
        salary: "$80k-$100k",
        description: "<p>Excel</p>",
      },
    ],
  },
  "https://www.arbeitnow.com/api/job-board-api": {
    data: [
      {
        slug: "data-analyst-berlin-1",
        company_name: "Hooli",
        title: "Data Analyst",
        description: "<p>German</p>",
        remote: false,
        url: "https://www.arbeitnow.com/jobs/data-analyst-berlin-1",
        job_types: ["full time"],
        location: "Berlin",
        created_at: 1760500000,
      },
    ],
  },
};

const fetchJson = async (url: string) => {
  if (!(url in fixtures)) throw new Error(`unexpected URL ${url}`);
  return fixtures[url];
};

describe("job sources", () => {
  it("normalizes Greenhouse", async () => {
    const [j] = await fetchGreenhouse("acme", "Acme", fetchJson);
    expect(j).toMatchObject({
      source: "greenhouse",
      externalId: "acme:123",
      company: "Acme",
      title: "Data Analyst",
      workMode: "remote",
      description: "SQL and Python",
      applyViaAts: true,
    });
    expect(j.postedAt?.toISOString()).toBe("2026-10-10T10:00:00.000Z");
  });

  it("normalizes Lever and converts monthly pay to annual", async () => {
    const [j] = await fetchLever("globex", "Globex", fetchJson);
    expect(j).toMatchObject({
      workMode: "hybrid",
      employmentType: "Full-time",
      salaryMin: 60000,
      salaryMax: 84000,
      salaryCurrency: "USD",
    });
  });

  it("normalizes Ashby and skips unlisted jobs", async () => {
    const jobs = await fetchAshby("initech", "Initech", fetchJson);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ workMode: "onsite", salaryMin: 70000, salaryCurrency: "GBP" });
  });

  it("normalizes Remotive with parsed salary", async () => {
    const [j] = await fetchRemotive("data analyst", fetchJson);
    expect(j).toMatchObject({ workMode: "remote", salaryMin: 80000, salaryMax: 100000, applyViaAts: false });
  });

  it("normalizes Arbeitnow", async () => {
    const [j] = await fetchArbeitnow(fetchJson);
    expect(j).toMatchObject({ location: "Berlin", workMode: null, description: "German" });
    expect(j.postedAt?.getTime()).toBe(1760500000 * 1000);
  });
});
