import type { Page } from "playwright-core";
import { answerFor, pickOption, type AnswerContext, type FieldInfo } from "./answers";

export type ResumeFile = { name: string; mimeType: string; buffer: Buffer };
export type FillResult = {
  status: "ready" | "submitted" | "needs_you" | "failed";
  note: string;
  screenshot: Buffer | null;
};

type FoundField = FieldInfo & { ref: string; optionRefs: string[] };

/** Lists the form's fields with their labels, tagging each so it can be filled afterwards. */
function collectFields(): FoundField[] {
  const textOf = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const labelOf = (el: HTMLElement): string => {
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
    const by = el.getAttribute("aria-labelledby");
    if (by) return by.split(" ").map((id) => textOf(document.getElementById(id))).join(" ");
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return textOf(l);
    }
    const wrap = el.closest("label");
    if (wrap) return textOf(wrap);
    let p = el.parentElement;
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      const l = p.querySelector("label, legend");
      if (l && !l.contains(el)) return textOf(l);
    }
    return el.getAttribute("placeholder") ?? el.getAttribute("name") ?? "";
  };
  const groupLabel = (el: HTMLElement): string => {
    const fs = el.closest("fieldset");
    if (fs?.querySelector("legend")) return textOf(fs.querySelector("legend"));
    const group = el.closest("[role=radiogroup], [role=group]");
    if (group) return group.getAttribute("aria-label") ?? labelOf(group as HTMLElement);
    let p = el.closest("label")?.parentElement ?? el.parentElement;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      const l = p.querySelector(":scope > label, :scope > legend, :scope > div > label");
      if (l && !l.querySelector("input")) return textOf(l);
    }
    return el.getAttribute("name") ?? "";
  };
  const isRequired = (el: HTMLElement, label: string) =>
    (el as HTMLInputElement).required || el.getAttribute("aria-required") === "true" || /\*\s*$|\*/.test(label);

  const out: FoundField[] = [];
  const radioGroups = new Map<string, FoundField>();
  let n = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("input, textarea, select"))) {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image", "search"].includes(type)) continue;
    const visible = el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    if (!visible && type !== "file") continue;
    const ref = String(n++);
    el.dataset.jp = ref;

    if (type === "radio") {
      const name = el.getAttribute("name") ?? ref;
      let group = radioGroups.get(name);
      if (!group) {
        const label = groupLabel(el);
        group = { ref, label, kind: "radio", required: isRequired(el, label), options: [], optionRefs: [] };
        radioGroups.set(name, group);
        out.push(group);
      }
      group.options.push(labelOf(el));
      group.optionRefs.push(ref);
      continue;
    }
    const label = labelOf(el);
    const kind: FieldInfo["kind"] =
      el.tagName === "SELECT"
        ? "select"
        : el.tagName === "TEXTAREA"
          ? "textarea"
          : type === "checkbox"
            ? "checkbox"
            : type === "file"
              ? "file"
              : el.getAttribute("role") === "combobox"
                ? "combobox"
                : "text";
    const options =
      kind === "select"
        ? Array.from((el as HTMLSelectElement).options)
            .map((o) => o.text.trim())
            .filter((t) => t && !/^(select|choose|please select)/i.test(t) && t !== "--")
        : [];
    out.push({ ref, label, kind, required: isRequired(el, label), options, optionRefs: [] });
  }
  return out;
}

/** Whether the page shows a CAPTCHA the person has to solve (invisible ones don't count). */
function visibleCaptcha(): boolean {
  return Array.from(document.querySelectorAll("iframe")).some((f) => {
    const src = f.getAttribute("src") ?? "";
    const shown = f.getClientRects().length > 0 && f.getBoundingClientRect().height > 30;
    if (!shown) return false;
    if (/recaptcha\/(api2|enterprise)\/(anchor|bframe)/.test(src)) return !/size=invisible/.test(src) || /bframe/.test(src);
    return /hcaptcha\.com|challenges\.cloudflare\.com/.test(src);
  });
}

const DONE = /thank you|thanks for applying|application (has been )?(received|submitted)|we('ve| have) received your application|successfully submitted/i;

/** Fills one application form. Sends it only when `submit` is true and nothing needs the person. */
export async function fillApplication(
  page: Page,
  url: string,
  ctx: AnswerContext,
  resume: ResumeFile | null,
  submit: boolean,
): Promise<FillResult> {
  const shot = async () => page.screenshot({ fullPage: true, type: "png" }).catch(() => null);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForSelector("input, textarea", { timeout: 20_000 }).catch(() => null);

  const fields = await page.evaluate(collectFields);
  if (fields.filter((f) => f.kind !== "checkbox").length < 2) {
    return { status: "needs_you", note: "We couldn't find an application form on this page. The job may be closed.", screenshot: await shot() };
  }

  const missing: string[] = [];
  for (const f of fields) {
    const answer = answerFor(f, ctx);
    const el = page.locator(`[data-jp="${f.ref}"]`);
    try {
      if (!answer) {
        if (f.required) missing.push(f.label || "an unnamed question");
        continue;
      }
      if ("file" in answer) {
        if (!resume) {
          if (f.required) missing.push("resume file");
          continue;
        }
        await el.setInputFiles({ name: resume.name, mimeType: resume.mimeType, buffer: resume.buffer });
      } else if ("check" in answer) {
        await el.check({ timeout: 5_000 });
      } else if (f.kind === "select") {
        const option = pickOption(f.options, answer.value);
        if (!option) throw new Error("no matching option");
        await el.selectOption({ label: option });
      } else if (f.kind === "radio") {
        const i = f.options.indexOf(pickOption(f.options, answer.value) ?? "\0");
        if (i < 0) throw new Error("no matching option");
        await page.locator(`[data-jp="${f.optionRefs[i]}"]`).check({ force: true, timeout: 5_000 });
      } else if (f.kind === "combobox") {
        await el.click({ timeout: 5_000 });
        await el.fill(answer.value);
        await page.waitForTimeout(600);
        await el.press("Enter");
      } else {
        await el.fill(answer.value, { timeout: 5_000 });
      }
    } catch {
      if (f.required) missing.push(f.label || "an unnamed question");
    }
  }

  if (missing.length) {
    return {
      status: "needs_you",
      note: `The form asks for something we don't have: ${missing.slice(0, 4).join("; ")}.`,
      screenshot: await shot(),
    };
  }
  if (await page.evaluate(visibleCaptcha)) {
    return { status: "needs_you", note: "The site shows a CAPTCHA, so please finish this one yourself.", screenshot: await shot() };
  }
  if (!submit) {
    return { status: "ready", note: "Filled in and checked, not sent (test mode).", screenshot: await shot() };
  }

  const button = page
    .locator('button[type=submit], input[type=submit], button:has-text("Submit application"), button:has-text("Submit")')
    .filter({ visible: true })
    .first();
  await button.click({ timeout: 10_000 });
  for (let waited = 0; waited < 20_000; waited += 1_000) {
    await page.waitForTimeout(1_000);
    if (DONE.test(await page.locator("body").innerText().catch(() => ""))) {
      return { status: "submitted", note: "Sent.", screenshot: await shot() };
    }
    if (await page.evaluate(visibleCaptcha)) {
      return { status: "needs_you", note: "The site asked for a CAPTCHA when sending, so please finish this one yourself.", screenshot: await shot() };
    }
  }
  return {
    status: "needs_you",
    note: "We pressed Submit but the site didn't confirm. Please check the form and send it yourself if needed.",
    screenshot: await shot(),
  };
}
