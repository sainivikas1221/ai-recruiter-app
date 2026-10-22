import { describe, expect, it } from "vitest";
import { rankJobs, titleMatch, type RankableJob } from "@/lib/jobs/rank";
import { relatedRoles, searchTerms } from "@/lib/jobs/roles";
import { elsewhereLinks } from "@/lib/jobs/elsewhere";
import { fetchJSearch } from "@/lib/jobs/sources/jsearch";
import { fetchJooble } from "@/lib/jobs/sources/jooble";
import { fetchHimalayas } from "@/lib/jobs/sources/himalayas";
import { fetchJobicy } from "@/lib/jobs/sources/jobicy";
import type { FetchInit } from "@/lib/jobs/types";
import type { Preferences } from "@/lib/profile";

const NOW = new Date("2026-10-19T12:00:00Z");

describe("titles for the same work", () => {
  it("accepts other names for a graphic designer and rejects other kinds of designer", () => {
    expect(titleMatch("Graphics Designer", ["Graphic Designer"])).toBe(1);
    expect(titleMatch("Sr. Graphic Design Executive", ["Graphic Designer"])).toBeGreaterThanOrEqual(0.5);
    expect(titleMatch("Visual Designer", ["Graphic Designer"])).toBeGreaterThanOrEqual(0.8);
    expect(titleMatch("DTP Operator", ["Graphic Designer"])).toBeGreaterThanOrEqual(0.8);
    expect(titleMatch("Creative Designer (Social Media)", ["Graphic Designer"])).toBeGreaterThanOrEqual(0.8);
    expect(titleMatch("Interior Designer", ["Graphic Designer"])).toBe(0);
    expect(titleMatch("Fashion Designer", ["Graphic Designer"])).toBe(0);
    expect(titleMatch("Brand Manager", ["Graphic Designer"])).toBeLessThan(0.5);
  });

  it("searches the user's roles first, then common other titles", () => {
    expect(relatedRoles("Graphic Designer")).toContain("visual designer");
    expect(relatedRoles("Sr. Graphic Designer")).toContain("creative designer");
    expect(searchTerms(["Graphic Designer"])).toEqual([
      "graphic designer", "visual designer", "creative designer",
    ]);
    expect(searchTerms(["Graphic Designer", "UI Designer", "Illustrator", "Video Editor"])).toHaveLength(5);
  });
});

describe("a graphic designer in Gurgaon", () => {
  const prefs: Preferences = {
    roles: ["Graphic Designer"],
    skills: ["Photoshop", "Illustrator", "CorelDRAW"],
    jobTypes: ["full_time"],
    workModes: ["onsite", "hybrid"],
    locations: ["Gurgaon"],
    salaryCurrency: "INR",
    salaryMin: null,
    salaryTarget: null,
  } as Preferences;
  const job = (over: Partial<RankableJob>): RankableJob => ({
    id: `x:${over.title}`, source: "jsearch", externalId: String(over.title), company: "Acme", title: "Graphic Designer",
    location: "Gurugram, Haryana, India", workMode: null, employmentType: "FULLTIME", salaryMin: null,
    salaryMax: null, salaryCurrency: null, url: "https://example.com", description: "Photoshop and CorelDRAW",
    postedAt: NOW, fetchedAt: NOW, applyViaAts: false, ...over,
  });

  it("finds the jobs Google lists and drops unrelated ones", () => {
    const ranked = rankJobs(
      [
        job({ title: "Graphic Designer" }),
        job({ title: "Visual Designer", company: "Beta" }),
        job({ title: "Interior Designer", company: "Gamma" }),
        job({ title: "Graphic Designer", company: "Delta", location: "Mumbai, Maharashtra, India" }),
      ],
      prefs,
      NOW,
    );
    expect(ranked.map((j) => j.title)).toEqual(["Graphic Designer", "Visual Designer"]);
  });

  it("links to Naukri, LinkedIn, Indeed and Shine searches for the role and city", () => {
    const links = Object.fromEntries(elsewhereLinks("Graphic Designer", prefs).map((l) => [l.site, l.url]));
    expect(links.Naukri).toBe("https://www.naukri.com/graphic-designer-jobs-in-gurgaon");
    expect(links.LinkedIn).toBe("https://www.linkedin.com/jobs/search/?keywords=Graphic%20Designer&location=Gurgaon");
    expect(links.Indeed).toBe("https://in.indeed.com/jobs?q=Graphic%20Designer&l=Gurgaon");
    expect(links.Shine).toBe("https://www.shine.com/job-search/graphic-designer-jobs-in-gurgaon");
    expect(links["Google Jobs"]).toContain("graphic%20designer%20jobs%20in%20Gurgaon".replace("graphic", "Graphic").replace("designer", "Designer"));
  });

  it("leaves out India-only sites for someone in London", () => {
    const sites = elsewhereLinks("Designer", { locations: ["London"], workModes: [] }).map((l) => l.site);
    expect(sites).toEqual(["LinkedIn", "Indeed", "Google Jobs"]);
  });
});

describe("more job sources", () => {
  const calls: { url: string; init?: FetchInit }[] = [];
  const fixtures: Record<string, unknown> = {
    jsearch: {
      data: [
        {
          job_id: "g1", employer_name: "Pixel Studio", job_publisher: "Naukri.com", job_title: "Graphic Designer",
          job_apply_link: "https://www.naukri.com/job-listings-g1", job_description: "CorelDRAW",
          job_is_remote: false, job_employment_type: "FULLTIME", job_posted_at_datetime_utc: "2026-10-18T00:00:00.000Z",
          job_city: "Gurugram", job_state: "Haryana", job_country: "IN", job_min_salary: 25000,
          job_max_salary: 35000, job_salary_currency: "INR", job_salary_period: "MONTH",
        },
      ],
    },
    jooble: {
      totalCount: 1,
      jobs: [
        {
          id: -123, title: "Graphic <b>Designer</b>", location: "Gurgaon, Haryana", snippet: "&nbsp;Photoshop...",
          salary: "₹3 - 4.5 lakh", source: "naukri.com", type: "Full-time", link: "https://jooble.org/desc/-123",
          company: "Print Hub", updated: "2026-10-17T10:00:00.000",
        },
      ],
    },
    himalayas: {
      jobs: [
        {
          guid: "h1", title: "Brand Designer", companyName: "Remote Co", employmentType: "Full Time",
          minSalary: 40000, maxSalary: 60000, currency: "USD", locationRestrictions: [{ name: "India" }],
          description: "<p>Figma</p>", pubDate: 1760700000000, applicationLink: "https://himalayas.app/apply/h1",
        },
      ],
    },
    jobicy: {
      jobs: [
        {
          id: 9, url: "https://jobicy.com/jobs/9", jobTitle: "Visual Designer &amp; Illustrator", companyName: "J Co",
          jobType: ["Full-Time"], jobGeo: "APAC", jobDescription: "<p>Canva</p>", pubDate: "2026-10-16 10:00:00",
        },
      ],
    },
  };
  const fetchJson = async (url: string, init?: FetchInit) => {
    calls.push({ url, init });
    const key = Object.keys(fixtures).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected URL ${url}`);
    return fixtures[key];
  };

  it("normalizes Google for Jobs (JSearch) and converts monthly pay to annual", async () => {
    process.env.JSEARCH_API_KEY = "k";
    const [j] = await fetchJSearch("graphic designer", "Gurgaon", "in", fetchJson);
    const call = calls.at(-1)!;
    expect(call.url).toContain("query=graphic+designer+jobs+in+Gurgaon");
    expect(call.url).toContain("country=in");
    expect(call.init?.headers?.["X-RapidAPI-Key"]).toBe("k");
    expect(j).toMatchObject({
      source: "jsearch", company: "Pixel Studio", location: "Gurugram, Haryana, IN", salaryMin: 300000,
      salaryMax: 420000, salaryCurrency: "INR", url: "https://www.naukri.com/job-listings-g1", applyViaAts: false,
    });
  });

  it("normalizes Jooble, posting the search as JSON", async () => {
    process.env.JOOBLE_API_KEY = "abc";
    const [j] = await fetchJooble("graphic designer", "Gurgaon", fetchJson);
    const call = calls.at(-1)!;
    expect(call.url).toBe("https://jooble.org/api/abc");
    expect(call.init?.method).toBe("POST");
    expect(JSON.parse(call.init!.body!)).toMatchObject({ keywords: "graphic designer", location: "Gurgaon" });
    expect(j).toMatchObject({ title: "Graphic Designer", company: "Print Hub", salaryMin: 300000, salaryMax: 450000, salaryCurrency: "INR" });
  });

  it("normalizes Himalayas and Jobicy as remote jobs", async () => {
    const [h] = await fetchHimalayas("graphic designer", fetchJson);
    expect(h).toMatchObject({ workMode: "remote", location: "India", salaryMin: 40000, url: "https://himalayas.app/apply/h1" });
    expect(h.postedAt?.getTime()).toBe(1760700000000);
    const [j] = await fetchJobicy("graphic designer", fetchJson);
    expect(j).toMatchObject({ workMode: "remote", title: "Visual Designer & Illustrator", location: "APAC", employmentType: "Full-Time" });
  });
});
