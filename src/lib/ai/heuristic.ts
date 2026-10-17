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

export function heuristicProfile(text: string): ExtractedProfile {
  const skills = SKILLS.filter((s) => mentions(text, s));
  const titles = TITLES.filter((t) => mentions(text, t));

  const years = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)].map((m) => Number(m[1]));
  const yearsExperience = years.length ? Math.max(...years.filter((y) => y <= 45)) : null;

  const workModes: WorkMode[] = ["remote"];
  if (/\bhybrid\b/i.test(text)) workModes.push("hybrid");

  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const looksLikeName = /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(firstLine) && firstLine.split(" ").length <= 4;

  return {
    fullName: looksLikeName ? firstLine : null,
    headline: titles[0] ?? "Professional",
    roles: titles.slice(0, 5),
    skills: skills.slice(0, 20),
    yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : null,
    jobTypes: ["full_time"],
    workModes,
    locations: [],
    salary: null,
  };
}
