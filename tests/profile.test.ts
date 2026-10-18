import { describe, expect, it } from "vitest";
import { heuristicProfile } from "@/lib/ai/heuristic";
import { preferencesFromProfile } from "@/lib/profile";

const RESUME = `Priya Sharma
Data Analyst · Bengaluru
6+ years of experience turning data into decisions.
Skills: SQL, Python, Tableau, Power BI, dbt, Excel
Experience
Senior Data Analyst, Acme Fintech (2021–present). Hybrid team.`;

describe("heuristicProfile", () => {
  it("pulls out name, roles, skills and years", () => {
    const p = heuristicProfile(RESUME);
    expect(p.fullName).toBe("Priya Sharma");
    expect(p.roles).toContain("Data Analyst");
    expect(p.skills).toEqual(expect.arrayContaining(["SQL", "Python", "Tableau", "Power BI", "dbt", "Excel"]));
    expect(p.skills).not.toContain("R");
    expect(p.yearsExperience).toBe(6);
    expect(p.workModes).toEqual(["remote", "hybrid"]);
  });
});

describe("preferencesFromProfile", () => {
  it("fills defaults and rounds numbers", () => {
    const prefs = preferencesFromProfile({
      fullName: null,
      headline: "x",
      roles: ["A", "B", "C", "D", "E", "F"],
      skills: [],
      yearsExperience: 4.6,
      jobTypes: [],
      workModes: [],
      locations: ["Pune"],
      salary: { currency: "INR", min: 1800000.4, target: 2500000, isEstimate: true },
    });
    expect(prefs.roles).toHaveLength(5);
    expect(prefs.jobTypes).toEqual(["full_time"]);
    expect(prefs.workModes).toEqual(["remote"]);
    expect(prefs.yearsExperience).toBe(5);
    expect(prefs.salaryMin).toBe(1800000);
  });
});

// Text as read from a LinkedIn "Save to PDF" export: the sidebar comes first.
const LINKEDIN_PDF = `Contact
vikas@example.com
www.linkedin.com/in/vikas-saini (LinkedIn)
Top Skills
Stakeholder Management
Product Strategy
SQL
Languages
Hindi
Vikas Saini
Senior Product Manager at Acme Fintech
Gurugram, Haryana, India
Summary
Product leader with 9 years of experience in payments.
Experience
Acme Fintech
Senior Product Manager
January 2021 - Present (3 years 9 months)
Gurugram, Haryana, India`;

describe("heuristicProfile on a LinkedIn profile PDF", () => {
  it("reads top skills, headline role and city", () => {
    const p = heuristicProfile(LINKEDIN_PDF, { name: "Vikas Saini" });
    expect(p.fullName).toBe("Vikas Saini");
    expect(p.headline).toBe("Senior Product Manager at Acme Fintech");
    expect(p.roles[0]).toBe("Product Manager");
    expect(p.skills.slice(0, 3)).toEqual(["Stakeholder Management", "Product Strategy", "SQL"]);
    expect(p.locations).toEqual(["Gurugram"]);
    expect(p.yearsExperience).toBe(9);
  });

  it("uses the headline itself when it isn't a known title", () => {
    const p = heuristicProfile(LINKEDIN_PDF.replaceAll("Senior Product Manager at", "Growth Lead at"), {
      name: "Vikas Saini",
    });
    expect(p.roles[0]).toBe("Growth Lead");
  });
});
