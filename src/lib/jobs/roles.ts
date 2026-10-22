/**
 * Job titles that mean the same work. Employers write "Visual Designer" or "DTP Operator" for what a
 * resume calls "Graphic Designer", so we search for and accept these too.
 * Each group lists titles people use interchangeably; the first is the most common.
 */
const ROLE_GROUPS: string[][] = [
  [
    "graphic designer", "visual designer", "creative designer", "brand designer", "communication designer",
    "graphic artist", "dtp operator", "social media designer", "packaging designer", "layout artist",
  ],
  ["ui designer", "ux designer", "ui ux designer", "product designer", "interaction designer", "web designer"],
  ["motion graphics designer", "motion designer", "animator", "video editor", "2d animator"],
  ["illustrator", "digital illustrator", "concept artist"],
  ["video editor", "video producer", "motion graphics designer", "content creator"],
  ["content writer", "copywriter", "content creator", "content strategist", "technical writer"],
  [
    "digital marketing executive", "digital marketer", "social media manager", "social media executive",
    "seo executive", "performance marketer", "marketing executive",
  ],
  [
    "software engineer", "software developer", "programmer", "application developer", "backend engineer",
    "frontend engineer", "full stack engineer", "sde",
  ],
  ["frontend developer", "react developer", "ui developer", "javascript developer", "web developer"],
  ["backend developer", "node.js developer", "java developer", "python developer", "api developer"],
  ["full stack developer", "mern stack developer", "web developer", "software engineer"],
  ["data analyst", "business analyst", "mis executive", "reporting analyst", "bi analyst"],
  ["data scientist", "machine learning engineer", "ai engineer"],
  ["accountant", "accounts executive", "finance executive", "accounts assistant"],
  ["hr executive", "hr generalist", "recruiter", "talent acquisition executive", "hr recruiter"],
  ["sales executive", "business development executive", "inside sales executive", "sales associate"],
  [
    "customer support executive", "customer service executive", "customer care executive",
    "telecaller", "customer success associate",
  ],
  ["teacher", "tutor", "educator", "trainer"],
  ["project manager", "program manager", "project coordinator"],
  ["product manager", "associate product manager", "product owner"],
  ["office assistant", "admin executive", "back office executive", "data entry operator"],
];

function clean(s: string) {
  return s
    .toLowerCase()
    .replace(/\b(senior|sr|junior|jr|lead|trainee|fresher|intern)\b\.?/g, " ")
    .replace(/[\/&,()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Other titles for the same work as `role`, most common first, never including `role` itself. */
export function relatedRoles(role: string): string[] {
  const r = clean(role);
  if (!r) return [];
  const out = new Set<string>();
  for (const group of ROLE_GROUPS) {
    if (group.some((t) => t === r || t.replace(/ /g, "") === r.replace(/ /g, ""))) {
      for (const t of group) if (t !== r) out.add(t);
    }
  }
  return [...out];
}

/**
 * The searches to run for someone's target roles: their own roles first, then the most common
 * other titles for their first role, up to `max` in total.
 */
export function searchTerms(roles: string[], max = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (t: string) => {
    const k = clean(t);
    if (k && !seen.has(k) && out.length < max) {
      seen.add(k);
      out.push(t.trim().toLowerCase());
    }
  };
  roles.slice(0, 3).forEach(add);
  for (const role of roles.slice(0, 2)) relatedRoles(role).slice(0, 2).forEach(add);
  return out;
}
