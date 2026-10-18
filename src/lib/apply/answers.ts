import type { ApplicantDetails } from "./suggest";

export type AnswerContext = {
  details: ApplicantDetails;
  email: string;
  yearsExperience: number | null;
  salary: { currency: string; amount: number } | null;
};

/** A form field as the filler sees it. */
export type FieldInfo = {
  label: string;
  kind: "text" | "textarea" | "select" | "radio" | "checkbox" | "file" | "combobox";
  required: boolean;
  options: string[];
};

export type Answer = { value: string } | { file: true } | { check: true } | null;

const yesNo = (b: boolean | null) => (b === null ? null : b ? "Yes" : "No");

/**
 * What to put in a field, from its label. Returns null when the details don't answer it,
 * so the field is left for the user rather than guessed.
 */
export function answerFor(field: FieldInfo, ctx: AnswerContext): Answer {
  const l = field.label.toLowerCase().replace(/\s+/g, " ").replace(/\*/g, "").trim();
  const d = ctx.details;
  const text = (v: string | null | undefined): Answer => (v ? { value: v } : null);

  if (field.kind === "file") {
    if (/cover letter/.test(l)) return null;
    return /resume|cv\b|curriculum/.test(l) || l === "" ? { file: true } : null;
  }
  if (field.kind === "checkbox") {
    // Required consent boxes ("I agree to the privacy notice") are part of applying.
    return field.required && /privacy|consent|agree|acknowledge|terms|confirm/.test(l) ? { check: true } : null;
  }

  if (/first name|given name|forename/.test(l)) return text(d.firstName);
  if (/last name|surname|family name/.test(l)) return text(d.lastName);
  if (/^(full )?name$|full name|your name|legal name|^name\b/.test(l) && !/company|employer|preferred/.test(l))
    return text(`${d.firstName} ${d.lastName}`.trim());
  if (/e-?mail/.test(l)) return text(ctx.email);
  if (/phone|mobile|contact number|telephone/.test(l)) return text(d.phone);
  if (/linkedin/.test(l)) return text(d.linkedinUrl);
  if (/github|portfolio|website|personal site|other url|blog/.test(l)) return text(d.websiteUrl);
  if (/current (company|employer)|present employer|organi[sz]ation/.test(l)) return text(d.currentCompany);
  if (/sponsor/.test(l)) return text(yesNo(d.needsSponsorship));
  if (/authori[sz]ed to work|legally (authori[sz]ed|eligible|able) to work|right to work|work permit|eligible to work/.test(l))
    return text(yesNo(d.authorizedToWork));
  if (/notice period|earliest start|when can you start|start date|availability/.test(l)) return text(d.noticePeriod);
  if (/cover letter|why (do you want|are you interested)|additional information|anything else/.test(l))
    return field.kind === "textarea" ? text(d.coverNote) : null;
  if (/salary|compensation|pay expectation|expected ctc|desired pay/.test(l))
    return ctx.salary ? { value: `${ctx.salary.amount} ${ctx.salary.currency} per year` } : null;
  if (/years of (professional )?experience|how many years/.test(l))
    return ctx.yearsExperience === null ? null : { value: String(ctx.yearsExperience) };
  if (/location|city|where are you (based|located)|current address|based in/.test(l)) return text(d.city);
  if (/how did you hear|where did you (hear|find)|source/.test(l)) return { value: "Job board" };
  return null;
}

/** Picks the option that matches an answer ("Yes" → "Yes, I am authorized"). */
export function pickOption(options: string[], answer: string): string | null {
  const a = answer.toLowerCase();
  return (
    options.find((o) => o.toLowerCase() === a) ??
    options.find((o) => o.toLowerCase().startsWith(a)) ??
    options.find((o) => o.toLowerCase().includes(a)) ??
    null
  );
}
