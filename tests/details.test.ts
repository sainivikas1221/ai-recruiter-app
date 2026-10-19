import { describe, expect, it } from "vitest";
import { cleanName, heuristicProfile } from "@/lib/ai/heuristic";
import { suggestDetails } from "@/lib/apply/suggest";

describe("cleanName", () => {
  it("drops credentials people add to their name", () => {
    expect(cleanName("Vikas Saini, CSM®")).toBe("Vikas Saini");
    expect(cleanName("Asha Verma PMP")).toBe("Asha Verma");
    expect(cleanName("Li")).toBe("Li");
  });
});

describe("suggestDetails", () => {
  const RESUME = `Vikas Saini, CSM®
Gurugram | (+91) 98765-43210 | vikas@example.com
Experience
Senior Product Manager, Acme Fintech (Jan 2021 – Present)
Product Manager, Globex (2017 – 2020)

Links:
mailto:vikas@example.com
https://www.linkedin.com/in/vikas-saini-1221/
https://vikas.dev`;

  it("reads phone, LinkedIn link, website and a clean name", () => {
    const d = suggestDetails({ name: "Vikas Saini, CSM®", text: RESUME, city: "Gurugram" });
    expect(d.firstName).toBe("Vikas");
    expect(d.lastName).toBe("Saini");
    expect(d.phone).toBe("(+91) 98765-43210");
    expect(d.linkedinUrl).toBe("https://www.linkedin.com/in/vikas-saini-1221");
    expect(d.websiteUrl).toBe("https://vikas.dev");
  });

  it("joins a LinkedIn link that wrapped onto the next line, and ignores year ranges", () => {
    const d = suggestDetails({
      name: "A B",
      text: "www.linkedin.com/in/asha-verma-\n12ab34 (LinkedIn)\nAcme 2019 - 2021 2022\nMobile: +1 415 555 0134",
      city: null,
    });
    expect(d.linkedinUrl).toBe("https://www.linkedin.com/in/asha-verma-12ab34");
    expect(d.phone).toBe("+1 415 555 0134");
  });

  it("gets the current company and a cover note from the resume", () => {
    const p = heuristicProfile(RESUME);
    expect(p.currentCompany).toBe("Acme Fintech");
    expect(p.coverNote).toContain("Product Manager");
    expect(p.coverNote).toContain("currently at Acme Fintech");
  });
});
