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

/** What the app already knows about the person, e.g. their name from LinkedIn sign-in. */
export type ProfileHints = { name?: string | null };

const LINKEDIN_SECTIONS = new Set([
  "contact", "top skills", "languages", "certifications", "honors-awards", "publications", "patents",
  "summary", "experience", "education", "volunteer experience", "projects", "courses",
]);

/** Reads the fixed layout of a LinkedIn "Save to PDF" profile: top skills, headline and location. */
function linkedinProfile(text: string, hints: ProfileHints) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = lines.map((l) => l.toLowerCase());
  const skillsAt = lower.indexOf("top skills");
  if (skillsAt === -1 || !lower.includes("experience")) return null;

  const skills: string[] = [];
  for (let i = skillsAt + 1; i < lines.length && !LINKEDIN_SECTIONS.has(lower[i]); i++) skills.push(lines[i]);

  // The name is followed by the headline and then the location.
  const name = hints.name?.trim().toLowerCase();
  const nameAt = name ? lower.indexOf(name) : -1;
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

export function heuristicProfile(text: string, hints: ProfileHints = {}): ExtractedProfile {
  const linkedin = linkedinProfile(text, hints);
  const unique = (xs: (string | null | undefined)[]) => {
    const seen = new Set<string>();
    return xs.filter((x): x is string => !!x && !seen.has(x.toLowerCase()) && !!seen.add(x.toLowerCase()));
  };
  const skills = unique([...(linkedin?.skills ?? []), ...SKILLS.filter((s) => mentions(text, s))]);
  const headline = linkedin?.headline ?? null;
  const titles = unique([
    ...(headline ? TITLES.filter((t) => mentions(headline, t)) : []),
    headline && !TITLES.some((t) => mentions(headline, t)) ? roleFromHeadline(headline) : null,
    ...TITLES.filter((t) => mentions(text, t)),
  ]);

  const years = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)].map((m) => Number(m[1]));
  const yearsExperience = years.length ? Math.max(...years.filter((y) => y <= 45)) : null;

  const workModes: WorkMode[] = ["remote"];
  if (/\bhybrid\b/i.test(text)) workModes.push("hybrid");

  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const looksLikeName = /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(firstLine) && firstLine.split(" ").length <= 4;

  return {
    fullName: hints.name ?? (looksLikeName && !linkedin ? firstLine : null),
    headline: headline ?? titles[0] ?? "Professional",
    roles: titles.slice(0, 5),
    skills: skills.slice(0, 20),
    yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : null,
    jobTypes: ["full_time"],
    workModes,
    locations: linkedin?.location ? [linkedin.location.split(",")[0].trim()] : [],
    salary: null,
  };
}
