import { describe, expect, it } from "vitest";
import { skillsTheJobWants, templateCoverLetter } from "@/lib/apply/cover-template";

const profile = {
  name: "Vikas Saini",
  role: "Product Manager",
  years: 9,
  currentCompany: "Acme Fintech",
  skills: ["SQL", "Stakeholder Management", "Product Strategy", "Jira", "Figma"],
};
const job = {
  company: "Zomato",
  title: "Senior Product Manager",
  description: "You will own product strategy for payments, work with Jira daily and partner with engineering.",
};

describe("templateCoverLetter", () => {
  it("names the job and company and leads with the skills the description asks for", () => {
    const letter = templateCoverLetter(profile, job);
    expect(letter.startsWith("Dear Zomato hiring team,")).toBe(true);
    expect(letter).toContain("Senior Product Manager role at Zomato");
    expect(letter).toContain("Product Manager with 9 years of experience, currently at Acme Fintech");
    expect(letter).toContain("Your description calls for Product Strategy and Jira");
    expect(letter.endsWith("Best regards,\nVikas Saini")).toBe(true);
  });

  it("still writes a full letter when the description is missing", () => {
    const letter = templateCoverLetter(profile, { ...job, description: null });
    expect(letter).toContain("My work centres on SQL");
    expect(letter.length).toBeGreaterThan(300);
  });

  it("matches whole skills only", () => {
    expect(skillsTheJobWants(["R", "Go"], "Great team, good culture")).toEqual([]);
  });
});
