import { describe, expect, it } from "vitest";
import { htmlToText, parseSalaryText, workModeFrom } from "@/lib/jobs/text";
import { parseBoards, DEFAULT_BOARDS } from "@/lib/jobs/boards";

describe("parseSalaryText", () => {
  it("reads common formats as annual amounts", () => {
    expect(parseSalaryText("$120k - $150k")).toEqual({ min: 120000, max: 150000, currency: "USD" });
    expect(parseSalaryText("USD 90,000-110,000")).toEqual({ min: 90000, max: 110000, currency: "USD" });
    expect(parseSalaryText("€50.000 – €60.000")).toEqual({ min: 50000, max: 60000, currency: "EUR" });
    expect(parseSalaryText("₹18 LPA")).toEqual({ min: 1800000, max: 1800000, currency: "INR" });
    expect(parseSalaryText("$50/hour")).toEqual({ min: 104000, max: 104000, currency: "USD" });
  });

  it("returns nulls when there is no salary", () => {
    expect(parseSalaryText("Competitive")).toEqual({ min: null, max: null, currency: null });
    expect(parseSalaryText("")).toEqual({ min: null, max: null, currency: null });
  });
});

describe("htmlToText", () => {
  it("handles entity-escaped HTML as Greenhouse returns it", () => {
    expect(htmlToText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;/ul&gt;")).toBe(
      "Hello & welcome\nSQL",
    );
  });
});

describe("workModeFrom", () => {
  it("detects work arrangements", () => {
    expect(workModeFrom("Remote - US")).toBe("remote");
    expect(workModeFrom("London (Hybrid)")).toBe("hybrid");
    expect(workModeFrom("San Francisco")).toBeNull();
  });
});

describe("parseBoards", () => {
  it("falls back to defaults and parses overrides", () => {
    expect(parseBoards(undefined)).toBe(DEFAULT_BOARDS);
    expect(parseBoards("greenhouse:acme:Acme Inc, lever:globex, bogus:x")).toEqual([
      { ats: "greenhouse", slug: "acme", company: "Acme Inc" },
      { ats: "lever", slug: "globex", company: "globex" },
    ]);
  });
});
