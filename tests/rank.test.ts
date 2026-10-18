import { describe, expect, it } from "vitest";
import { rankJobs, scoreJob, titleMatch, type RankableJob } from "@/lib/jobs/rank";
import type { Preferences } from "@/lib/profile";

const NOW = new Date("2026-10-17T12:00:00Z");

const prefs: Preferences = {
  roles: ["Data Analyst", "BI Developer"],
  skills: ["SQL", "Python", "Tableau", "dbt"],
  jobTypes: ["full_time"],
  workModes: ["remote", "hybrid"],
  locations: ["Bengaluru"],
  salaryCurrency: "USD",
  salaryMin: 90000,
  salaryTarget: 120000,
  yearsExperience: 5,
};

function job(overrides: Partial<RankableJob>): RankableJob {
  return {
    id: "greenhouse:acme:1",
    source: "greenhouse",
    externalId: "acme:1",
    company: "Acme",
    title: "Senior Data Analyst",
    location: "Remote",
    workMode: "remote",
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    url: "https://example.com/1",
    description: "We use SQL, Python and Tableau every day.",
    postedAt: new Date("2026-10-16T00:00:00Z"),
    fetchedAt: NOW,
    applyViaAts: true,
    ...overrides,
  };
}

describe("titleMatch", () => {
  it("ignores seniority words and handles abbreviations", () => {
    expect(titleMatch("Sr. Data Analyst", ["Data Analyst"])).toBe(1);
    expect(titleMatch("Business Intelligence (BI) Developer", ["BI Developer"])).toBe(1);
    expect(titleMatch("Frontend Engineer", ["Front-end engineer"])).toBe(1);
    expect(titleMatch("Account Executive", ["Data Analyst"])).toBe(0);
  });
});

describe("scoreJob", () => {
  it("scores a strong remote match highly and explains why", () => {
    const result = scoreJob(job({}), prefs, NOW)!;
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons).toContain("Title matches your target role");
    expect(result.reasons).toContain("Remote, open worldwide");
    expect(result.local).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("Mentions SQL"))).toBe(true);
  });

  it("drops unrelated roles", () => {
    expect(scoreJob(job({ title: "Account Executive" }), prefs, NOW)).toBeNull();
  });

  it("drops office jobs in cities the user didn't pick", () => {
    expect(scoreJob(job({ location: "Berlin", workMode: "onsite" }), prefs, NOW)).toBeNull();
    expect(scoreJob(job({ location: "Bengaluru, India", workMode: "hybrid" }), prefs, NOW)).not.toBeNull();
  });

  it("keeps Gurgaon jobs and drops other regions for a Gurgaon user", () => {
    const gurgaon = { ...prefs, locations: ["Gurgaon"], workModes: ["remote" as const, "hybrid" as const, "onsite" as const] };
    const local = scoreJob(job({ location: "Gurugram, Haryana, India", workMode: "onsite" }), gurgaon, NOW)!;
    expect(local.local).toBe(true);
    expect(local.reasons).toContain("In Gurugram, Haryana, India");
    expect(scoreJob(job({ location: "Remote - India", workMode: "remote" }), gurgaon, NOW)!.local).toBe(true);
    expect(scoreJob(job({ location: "Remote (US only)", workMode: "remote" }), gurgaon, NOW)).toBeNull();
    expect(scoreJob(job({ location: "London, UK", workMode: "hybrid" }), gurgaon, NOW)).toBeNull();
    expect(scoreJob(job({ location: "Berlin", workMode: null }), gurgaon, NOW)).toBeNull();
    const worldwide = scoreJob(job({ location: "Worldwide", workMode: "remote" }), gurgaon, NOW)!;
    expect(worldwide.local).toBe(false);
    expect(local.score).toBeGreaterThan(worldwide.score);
  });

  it("drops remote jobs when the user only wants to work in person elsewhere", () => {
    const onsiteOnly = { ...prefs, workModes: ["onsite" as const] };
    expect(scoreJob(job({ location: "Remote - US" }), onsiteOnly, NOW)).toBeNull();
  });

  it("drops contract roles for someone who wants full-time", () => {
    expect(scoreJob(job({ employmentType: "Contract" }), prefs, NOW)).toBeNull();
    expect(scoreJob(job({ employmentType: "Full-time" }), prefs, NOW)).not.toBeNull();
  });

  it("shows freelance work to people who pick Freelance", () => {
    const freelancer = { ...prefs, jobTypes: ["freelance" as const] };
    expect(scoreJob(job({ employmentType: "freelance" }), freelancer, NOW)).not.toBeNull();
    expect(scoreJob(job({ employmentType: "Full-time" }), freelancer, NOW)).toBeNull();
    expect(scoreJob(job({ employmentType: "freelance" }), prefs, NOW)).toBeNull();
  });

  it("rewards pay at or above target and flags pay below minimum", () => {
    const high = scoreJob(job({ salaryMax: 130000, salaryCurrency: "USD" }), prefs, NOW)!;
    const low = scoreJob(job({ salaryMax: 60000, salaryCurrency: "USD" }), prefs, NOW)!;
    const unknown = scoreJob(job({}), prefs, NOW)!;
    expect(high.score).toBeGreaterThan(unknown.score);
    expect(low.score).toBeLessThan(unknown.score);
    expect(low.reasons).toContain("Pays below your minimum");
  });

  it("ignores salaries in another currency", () => {
    const eur = scoreJob(job({ salaryMax: 10, salaryCurrency: "EUR" }), prefs, NOW)!;
    expect(eur.score).toBe(scoreJob(job({}), prefs, NOW)!.score);
  });
});

describe("rankJobs", () => {
  it("sorts best first and removes the same role listed on two sources", () => {
    const jobs = [
      job({ id: "remotive:9", source: "remotive", applyViaAts: false, title: "Data Analyst", description: "" }),
      job({ id: "greenhouse:acme:1" }),
      job({ id: "remotive:10", source: "remotive", applyViaAts: false, title: "Senior Data Analyst" }),
      job({ id: "x", company: "Globex", title: "BI Developer", description: "Power BI" }),
    ];
    const ranked = rankJobs(jobs, prefs, NOW);
    const ids = ranked.map((j) => j.id);
    expect(ids).toContain("greenhouse:acme:1");
    expect(ids).not.toContain("remotive:10");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].score);
  });
});
