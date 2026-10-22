import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";
import type { AnswerContext } from "@/lib/apply/answers";
import { fillApplication } from "@/lib/apply/fill";

// Runs against a local copy of a typical career-site form; skipped where no browser is installed.
const FORM = readFileSync(path.join(__dirname, "fixtures/application-form.html"), "utf8");
const page = (html: string) => `data:text/html;base64,${Buffer.from(html).toString("base64")}`;

const ctx: AnswerContext = {
  details: {
    firstName: "Asha",
    lastName: "Verma",
    phone: "+91 98765 43210",
    city: "Gurugram",
    linkedinUrl: "https://www.linkedin.com/in/asha",
    websiteUrl: null,
    currentCompany: "Acme",
    authorizedToWork: true,
    needsSponsorship: false,
    noticePeriod: "30 days",
    coverNote: null,
  },
  email: "asha@example.com",
  yearsExperience: 6,
  salary: null,
};
const resume = { name: "resume.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") };

let browser: Browser | null = null;
beforeAll(async () => {
  for (const opts of [{ executablePath: process.env.AUTO_APPLY_BROWSER }]) {
    try {
      browser = await chromium.launch(opts);
      return;
    } catch {}
  }
});
afterAll(() => browser?.close());

describe.runIf(process.env.AUTO_APPLY_BROWSER)("fillApplication", () => {
  it("fills every field it can answer and leaves the form unsent in test mode", async () => {
    const p = await browser!.newPage();
    const result = await fillApplication(p, page(FORM), ctx, resume, false);
    expect(result.status).toBe("ready");
    expect(await p.inputValue("#first_name")).toBe("Asha");
    expect(await p.inputValue("#email")).toBe("asha@example.com");
    expect(await p.inputValue("#q1")).toBe("https://www.linkedin.com/in/asha");
    expect(await p.locator("#q2").evaluate((s: HTMLSelectElement) => s.selectedOptions[0].text)).toBe("Yes");
    expect(await p.locator("input[name=sponsor][value='0']").isChecked()).toBe(true);
    expect(await p.locator("#eeo").inputValue()).toBe("");
    expect(await p.locator("#consent").isChecked()).toBe(true);
    expect(await p.locator("#resume").evaluate((i: HTMLInputElement) => i.files?.[0]?.name)).toBe("resume.pdf");
    expect(result.screenshot?.length).toBeGreaterThan(1000);
  });

  it("stops at questions it can't answer", async () => {
    const extra = `<div><label for="why">Why do you want to work at Acme? *</label><input id="why" required></div>`;
    const result = await fillApplication(await browser!.newPage(), page(FORM.replace("<!--EXTRA-->", extra)), ctx, resume, true);
    expect(result.status).toBe("needs_you");
    expect(result.note).toContain("Why do you want to work at Acme?");
  });

  it("stops at a visible CAPTCHA", async () => {
    const captcha = `<iframe src="https://www.google.com/recaptcha/api2/anchor?k=x&size=normal" width="300" height="80"></iframe>`;
    const result = await fillApplication(await browser!.newPage(), page(FORM.replace("<!--EXTRA-->", captcha)), ctx, resume, true);
    expect(result.status).toBe("needs_you");
    expect(result.note).toContain("CAPTCHA");
  });

  it("sends the form when submitting is turned on", async () => {
    const result = await fillApplication(await browser!.newPage(), page(FORM), ctx, resume, true);
    expect(result.status).toBe("submitted");
  });
});
