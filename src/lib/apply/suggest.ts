import { cleanName } from "@/lib/ai/heuristic";

/** What application forms ask for beyond the resume. */
export type ApplicantDetails = {
  firstName: string;
  lastName: string;
  phone: string | null;
  city: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  currentCompany: string | null;
  authorizedToWork: boolean | null;
  needsSponsorship: boolean | null;
  noticePeriod: string | null;
  coverNote: string | null;
};

const PHONE = /(?:\(?\+\d{1,3}\)?[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d[\d\s.-]{7,14}\d/g;
const YEARS = /\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b/;

function phoneIn(text: string): string | null {
  const tel = /tel:([+\d\s().-]{8,})/i.exec(text)?.[1];
  if (tel) return tel.trim();
  const candidates = (line: string) =>
    [...line.matchAll(PHONE)]
      .map((m) => m[0].trim())
      .filter((p) => {
        const digits = p.replace(/\D/g, "").length;
        return digits >= 10 && digits <= 13 && !YEARS.test(p);
      });
  const lines = text.split("\n");
  // Prefer a number on a line that says what it is.
  for (const line of lines) if (/phone|mobile|mob\b|cell|contact|tel\b|whatsapp/i.test(line) && candidates(line).length) return candidates(line)[0];
  for (const line of lines) if (candidates(line).length) return candidates(line)[0];
  return null;
}

function linkedinIn(text: string): string | null {
  // Long profile links often wrap onto the next line in PDFs.
  const joined = text.replace(/(linkedin\.com\/in\/[\w%-]*-)\s*\n\s*([\w%-]+)/gi, "$1$2");
  const m = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9_%-]+)/i.exec(joined);
  return m ? `https://www.linkedin.com/in/${m[1].replace(/-+$/, "")}` : null;
}

function websiteIn(text: string): string | null {
  const links = text.split(/\nLinks:\n/)[1]?.split("\n") ?? [];
  const fromLinks = links.find((l) => /^https?:/i.test(l) && !/linkedin\.com|mailto:|google\.com\/maps/i.test(l));
  if (fromLinks) return fromLinks;
  const github = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i.exec(text)?.[0];
  return github ? (/^https?:/i.test(github) ? github : `https://${github}`) : null;
}

/** A first draft of the details, read from documents the user already gave us. */
export function suggestDetails(input: {
  name: string | null;
  text: string;
  city: string | null;
  currentCompany?: string | null;
  coverNote?: string | null;
}): ApplicantDetails {
  const parts = (cleanName(input.name) ?? "").split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    phone: phoneIn(input.text),
    city: input.city,
    linkedinUrl: linkedinIn(input.text),
    websiteUrl: websiteIn(input.text),
    currentCompany: input.currentCompany ?? null,
    authorizedToWork: null,
    needsSponsorship: null,
    noticePeriod: null,
    coverNote: input.coverNote || null,
  };
}
