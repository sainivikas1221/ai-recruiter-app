import { currencyFor, homeCity } from "@/lib/jobs/geo";
import type { ExtractedProfile, WorkMode } from "@/lib/profile";

// A small vocabulary is enough for a local fallback; Claude does the real extraction.
const SKILLS = [
  "Python", "SQL", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C++", "C#", "Ruby", "PHP",
  "Kotlin", "Swift", "Scala", "R", "React", "Next.js", "Node.js", "Angular", "Vue", "Django",
  "Flask", "FastAPI", "Spring", "Rails", "AWS", "GCP", "Azure", "Docker", "Kubernetes",
  "Terraform", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "Spark", "Airflow", "dbt",
  "Snowflake", "BigQuery", "Tableau", "Power BI", "Looker", "Excel", "Pandas", "TensorFlow",
  "PyTorch", "Machine Learning", "Figma", "GraphQL", "Git", "Linux", "Salesforce", "SEO",
];

const TITLES = [
  "Software Engineer", "Backend Engineer", "Frontend Engineer", "Full Stack Engineer",
  "Data Analyst", "Data Scientist", "Data Engineer", "Machine Learning Engineer",
  "DevOps Engineer", "Site Reliability Engineer", "Product Manager", "Product Designer",
  "UX Designer", "Business Analyst", "BI Developer", "QA Engineer", "Engineering Manager",
  "Project Manager", "Marketing Manager", "Sales Manager", "Account Executive",
  "Customer Success Manager", "Mobile Engineer", "Security Engineer", "Solutions Architect",
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentions(text: string, term: string) {
  // Word boundaries that also work for terms like "C++" and "Next.js".
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(term)}(?![A-Za-z0-9])`, "i").test(text);
}

/** "Vikas Saini, CSM®" → "Vikas Saini": drops credentials and marks people add to their name. */
export function cleanName(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name
    .replace(/[®™©]/g, "")
    .split(",")[0]
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && /^(?:[A-Z]{2,6}|Ph\.?D\.?|MBA|CSM|PMP|CSPO|SAFe|CFA|CPA|Jr\.?|Sr\.?)$/.test(words[words.length - 1])) words.pop();
  return words.join(" ") || null;
}

function joinList(xs: string[]) {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** The employer of the current job: "Senior Analyst, Acme (2021–present)" → "Acme". */
function currentCompany(text: string, linkedinLines: string[] | null): string | null {
  if (linkedinLines) {
    const at = linkedinLines.findIndex((l) => l.toLowerCase() === "experience");
    const next = at >= 0 ? linkedinLines[at + 1] : undefined;
    return next && !LINKEDIN_SECTIONS.has(next.toLowerCase()) ? next : null;
  }
  const line = text.split("\n").find((l) => /\b(present|current|till date|to date|now)\b/i.test(l) && /\d{4}/.test(l));
  if (!line) return null;
  const parts = line
    .replace(/\(.*$/, "")
    .split(/\s*[,|–—]\s*|\s+-\s+|\s+at\s+|\s+@\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !/\d/.test(p) && !/\b(present|current)\b/i.test(p));
  const company = parts.find((p) => !TITLES.some((t) => mentions(p, t)) && !/\b(engineer|manager|analyst|developer|designer|lead|director|consultant|intern|head)\b/i.test(p));
  return company && company.split(/\s+/).length <= 6 ? company : null;
}

/** What the app already knows about the person, e.g. their name from LinkedIn sign-in. */
export type ProfileHints = { name?: string | null };

const LINKEDIN_SECTIONS = new Set([
  "contact", "top skills", "languages", "certifications", "honors-awards", "publications", "patents",
  "summary", "experience", "education", "volunteer experience", "projects", "courses",
]);

/** Whether a document is LinkedIn's "Save to PDF" export of a profile. */
export function isLinkedInExport(text: string) {
  const lines = text.split("\n").map((l) => l.trim().toLowerCase());
  return lines.includes("top skills") && lines.includes("experience");
}

/** Reads the fixed layout of a LinkedIn "Save to PDF" profile: top skills, headline and location. */
function linkedinProfile(text: string, hints: ProfileHints) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = lines.map((l) => l.toLowerCase());
  if (!isLinkedInExport(text)) return null;
  const skillsAt = lower.indexOf("top skills");

  const skills: string[] = [];
  for (let i = skillsAt + 1; i < lines.length && !LINKEDIN_SECTIONS.has(lower[i]); i++) skills.push(lines[i]);

  // The name is followed by the headline and then the location.
  const name = cleanName(hints.name)?.toLowerCase();
  const nameAt = name ? lower.findIndex((l) => l === name || cleanName(l)?.toLowerCase() === name) : -1;
  const headline = nameAt >= 0 && !LINKEDIN_SECTIONS.has(lower[nameAt + 1] ?? "summary") ? lines[nameAt + 1] : null;
  const place = nameAt >= 0 ? lines[nameAt + 2] : undefined;
  const location = place && place.includes(",") && !LINKEDIN_SECTIONS.has(place.toLowerCase()) ? place : null;
  return { skills: skills.slice(0, 10), headline, location };
}

function roleFromHeadline(headline: string) {
  const first = headline.split(/\s+(?:at|@)\s+|\s*[|•·,]\s*/)[0].trim();
  const words = first.split(/\s+/).length;
  return words >= 1 && words <= 6 ? first : null;
}

const SYMBOLS: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₹": "INR" };

/** A salary the resume itself asks for, e.g. "Expected CTC: 25 LPA" or "Desired salary $120k". */
function statedSalary(text: string, city: string | null): ExtractedProfile["salary"] {
  const line = text.split("\n").find((l) => /\b(expected|expectation|desired)\b.*\b(ctc|salary|compensation|package)\b/i.test(l));
  if (!line) return null;
  const lakhs = /(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lacs?)\b/i.exec(line);
  if (lakhs) {
    const amount = Math.round(Number(lakhs[1]) * 100_000);
    return { currency: "INR", min: amount, target: amount, isEstimate: false };
  }
  const m = /([$€£₹])?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i.exec(line.replace(/^[^:\d$€£₹]*/, ""));
  if (!m) return null;
  const amount = Math.round(Number(m[2].replace(/,/g, "")) * (m[3] ? 1000 : 1));
  const currency = (m[1] && SYMBOLS[m[1]]) || (city && currencyFor(city));
  if (!currency || amount < 1000) return null;
  return { currency, min: amount, target: amount, isEstimate: false };
}

export function heuristicProfile(text: string, hints: ProfileHints = {}): ExtractedProfile {
  const linkedin = linkedinProfile(text, hints);
  const unique = (xs: (string | null | undefined)[]) => {
    const seen = new Set<string>();
    return xs.filter((x): x is string => !!x && !seen.has(x.toLowerCase()) && !!seen.add(x.toLowerCase()));
  };
  // A "Skills: A, B, C" line lists them in the person's own words.
  const listed = text
    .split("\n")
    .filter((l) => /^\s*(key |technical |core )?skills\s*[:|-]/i.test(l))
    .flatMap((l) => l.replace(/^[^:|-]*[:|-]/, "").split(/[,;|•·]/))
    .map((x) => x.trim())
    .filter((x) => x.length > 1 && x.length < 40);
  const skills = unique([...(linkedin?.skills ?? []), ...listed, ...SKILLS.filter((s) => mentions(text, s))]);
  const headline = linkedin?.headline ?? null;
  const titles = unique([
    ...(headline ? TITLES.filter((t) => mentions(headline, t)) : []),
    headline && !TITLES.some((t) => mentions(headline, t)) ? roleFromHeadline(headline) : null,
    ...TITLES.filter((t) => mentions(text, t)),
  ]);

  const years = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)].map((m) => Number(m[1]));
  const yearsExperience = years.length ? Math.max(...years.filter((y) => y <= 45)) : null;

  const city = linkedin?.location?.split(",")[0].trim() || homeCity(text);
  // Someone with a home city can also work from an office there.
  const workModes: WorkMode[] = city ? ["remote", "hybrid", "onsite"] : ["remote"];
  if (!city && /\bhybrid\b/i.test(text)) workModes.push("hybrid");

  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const looksLikeName = /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(firstLine) && firstLine.split(" ").length <= 4;
  const lines = linkedin ? text.split("\n").map((l) => l.trim()).filter(Boolean) : null;
  const company = currentCompany(text, lines);
  const role = titles[0] ?? null;
  const yrs = Number.isFinite(yearsExperience) ? yearsExperience : null;

  const coverNote = [
    `I'm ${role ? `a ${role}` : "a professional"}${yrs ? ` with ${yrs} years of experience` : ""}${company ? `, currently at ${company}` : ""}.`,
    skills.length ? `My work centres on ${joinList(skills.slice(0, 4))}.` : "",
    `I'm looking for my next ${role ? `${role} ` : ""}role, where I can bring that experience to a team that values ownership and clear results.`,
    "I'd welcome the chance to talk about how I can help.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    fullName: cleanName(hints.name) ?? (looksLikeName && !linkedin ? firstLine : null),
    headline: headline ?? titles[0] ?? "Professional",
    roles: titles.slice(0, 5),
    skills: skills.slice(0, 20),
    yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : null,
    jobTypes: ["full_time"],
    workModes,
    locations: city ? [city] : [],
    salary: statedSalary(text, city),
    currentCompany: company,
    coverNote,
  };
}
