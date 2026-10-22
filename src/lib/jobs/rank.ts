import type { Preferences } from "@/lib/profile";
import type { NormalizedJob } from "./types";
import { inUserPlace, remoteOpenTo, userPlaces, type UserPlaces } from "./geo";
import { relatedRoles } from "./roles";

export type RankableJob = Omit<NormalizedJob, "postedAt"> & {
  id: string;
  postedAt: Date | null;
  fetchedAt: Date;
};

/** `local` = in one of the user's places, or remote and open to people living there. */
export type RankedJob = RankableJob & { score: number; reasons: string[]; local: boolean };

const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "for", "to", "in", "with", "at", "on", "i", "ii", "iii",
  "sr", "jr", "senior", "junior", "lead", "staff", "principal", "head", "remote", "hybrid",
]);

// Treat common abbreviations and spellings as the same word.
const SYNONYMS: Record<string, string> = {
  dev: "developer", developers: "developer", engineers: "engineer", eng: "engineer",
  swe: "engineer", programmer: "developer", ml: "machine-learning", ai: "machine-learning",
  frontend: "front-end", backend: "back-end", fullstack: "full-stack", ux: "ui-ux",
  ui: "ui-ux", designer: "design", analytics: "analyst", analysis: "analyst", pm: "product",
  sre: "reliability", devops: "devops", bi: "business-intelligence", qa: "quality",
  graphics: "graphic", designers: "design", designing: "design", artists: "artist",
  editors: "editor", executives: "executive", writers: "writer", managers: "manager",
};

// Words that say what level or kind of job it is but not what the work is. A "Graphic Designer"
// search should not accept an "Interior Designer", so these count for less than the other words.
const GENERIC = new Set([
  "design", "developer", "engineer", "manager", "executive", "analyst", "specialist", "associate",
  "assistant", "officer", "consultant", "artist", "operator", "writer", "editor", "coordinator",
  "director", "head", "vp", "president", "intern", "trainee",
]);
const GENERIC_WEIGHT = 0.35;
/** A title that is another name for the same role counts a little less than the role itself. */
const RELATED_FACTOR = 0.85;

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/front[\s-]end/g, "frontend")
    .replace(/back[\s-]end/g, "backend")
    .replace(/full[\s-]stack/g, "fullstack")
    .replace(/machine learning/g, "ml")
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/\.$/, ""))
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => SYNONYMS[t] ?? t);
}

function roleMatch(titleTokens: Set<string>, role: string): number {
  const roleTokens = [...new Set(tokens(role))];
  let total = 0;
  let hit = 0;
  let specific = false;
  let specificHit = false;
  for (const t of roleTokens) {
    const generic = GENERIC.has(t);
    const w = generic ? GENERIC_WEIGHT : 1;
    total += w;
    if (!generic) specific = true;
    if (titleTokens.has(t)) {
      hit += w;
      if (!generic) specificHit = true;
    }
  }
  // Sharing only "Designer" or "Executive" says nothing about the work itself.
  if (specific && !specificHit) return 0;
  return total ? hit / total : 0;
}

/** 0..1: how well a job title matches the best of the user's target roles (or other names for them). */
export function titleMatch(title: string, roles: string[]): number {
  const titleTokens = new Set(tokens(title));
  let best = 0;
  for (const role of roles) {
    best = Math.max(best, roleMatch(titleTokens, role));
    if (best >= 1) break;
    // Another name only counts when the title has all of it: "Brand Designer", not "Brand Manager".
    if (relatedRoles(role).some((other) => roleMatch(titleTokens, other) >= 1)) {
      best = Math.max(best, RELATED_FACTOR);
    }
  }
  return best;
}

function mentionsSkill(haystack: string, skill: string) {
  const s = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${s}(?![a-z0-9])`).test(haystack);
}

function normalizePlace(s: string) {
  return s.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

const EMPLOYMENT_ALIASES: Record<string, string[]> = {
  full_time: ["full", "permanent", "fulltime", "full_time", "full-time"],
  part_time: ["part", "parttime", "part_time", "part-time"],
  contract: ["contract", "contractor"],
  freelance: ["freelance", "freelancer", "per project", "project-based", "project based"],
  internship: ["intern"],
  temporary: ["temp"],
};

function employmentMatches(employmentType: string | null, wanted: string[]): boolean | null {
  if (!employmentType || !wanted.length) return null;
  const e = employmentType.toLowerCase();
  const known = Object.values(EMPLOYMENT_ALIASES).some((aliases) => aliases.some((a) => e.includes(a)));
  if (!known) return null;
  return wanted.some((w) => (EMPLOYMENT_ALIASES[w] ?? [w]).some((a) => e.includes(a)));
}

function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

/**
 * Scores one job from 0 to 100 against the user's preferences and explains the score.
 * Weights: title 45, skills 25, location and work mode 15, salary 10, recency 5.
 * Returns null when the job is clearly not a fit (wrong role, wrong place, wrong type).
 */
export function scoreJob(
  job: RankableJob,
  prefs: Preferences,
  now = new Date(),
  places: UserPlaces = userPlaces(prefs.locations),
): { score: number; reasons: string[]; local: boolean } | null {
  const reasons: string[] = [];

  const title = titleMatch(job.title, prefs.roles);
  if (prefs.roles.length && title < 0.5) return null;
  if (title >= 0.99) reasons.push("Title matches your target role");
  else if (title > 0) reasons.push("Title is close to your target role");

  const haystack = `${job.title}\n${job.description ?? ""}`.toLowerCase();
  const matchedSkills = prefs.skills.filter((s) => mentionsSkill(haystack, s));
  const skillScore = prefs.skills.length
    ? Math.min(1, matchedSkills.length / Math.min(6, prefs.skills.length))
    : 0.5;
  if (matchedSkills.length) reasons.push(`Mentions ${matchedSkills.slice(0, 4).join(", ")}`);

  // Location and work mode.
  const wantsRemote = prefs.workModes.includes("remote");
  const wantsInPerson = prefs.workModes.includes("hybrid") || prefs.workModes.includes("onsite");
  const where = inUserPlace(job.location, places);
  let placeScore: number;
  let local = false;
  if (job.workMode === "remote") {
    if (where === "city") {
      placeScore = 1;
      local = true;
      reasons.push(`Remote, based in ${job.location}`);
    } else if (!wantsRemote) {
      return null;
    } else {
      // Only remote jobs someone living in the user's places is allowed to take.
      const open = remoteOpenTo(job.location, places);
      if (!open) return null;
      placeScore = open === "country" ? 0.9 : 0.7;
      local = open === "country";
      reasons.push(open === "country" ? `Remote, open in ${job.location}` : "Remote, open worldwide");
    }
  } else if (where === "city" || (where === "country" && places.cities.size === 0)) {
    if (job.workMode && !prefs.workModes.includes(job.workMode) && !wantsInPerson) return null;
    placeScore = 1;
    local = true;
    reasons.push(`In ${job.location}`);
  } else if (prefs.locations.length && job.location) {
    // An office (or unspecified) job somewhere the user hasn't said they want to work.
    return null;
  } else {
    placeScore = 0.4;
  }

  const employment = employmentMatches(job.employmentType, prefs.jobTypes);
  if (employment === false) return null;

  // Salary: neutral when either side is unknown or currencies differ.
  let salaryScore = 0.5;
  if (
    prefs.salaryMin &&
    prefs.salaryCurrency &&
    job.salaryCurrency === prefs.salaryCurrency &&
    (job.salaryMax || job.salaryMin)
  ) {
    const top = (job.salaryMax ?? job.salaryMin)!;
    const target = prefs.salaryTarget ?? prefs.salaryMin;
    if (top >= target) {
      salaryScore = 1;
      reasons.push(`Pays up to ${formatMoney(top, job.salaryCurrency)}`);
    } else if (top >= prefs.salaryMin) {
      salaryScore = 0.75;
      reasons.push(`Pays up to ${formatMoney(top, job.salaryCurrency)}`);
    } else {
      salaryScore = Math.max(0, top / prefs.salaryMin - 0.5);
      reasons.push(`Pays below your minimum`);
    }
  }

  const posted = job.postedAt ?? job.fetchedAt;
  const ageDays = (now.getTime() - posted.getTime()) / 86_400_000;
  const recency = ageDays <= 7 ? 1 : ageDays <= 21 ? 0.6 : 0.2;
  if (ageDays <= 3) reasons.push("Posted in the last 3 days");

  const titleWeight = prefs.roles.length ? 45 * title : 20;
  const score =
    titleWeight + 25 * skillScore + 15 * placeScore + 10 * salaryScore + 5 * recency;
  return { score: Math.round(Math.min(100, score)), reasons, local };
}

/** Ranks jobs best first and drops near-duplicate listings of the same role. */
export function rankJobs(jobs: RankableJob[], prefs: Preferences, now = new Date()): RankedJob[] {
  const places = userPlaces(prefs.locations);
  const scored: RankedJob[] = [];
  for (const job of jobs) {
    const result = scoreJob(job, prefs, now, places);
    if (result) scored.push({ ...job, ...result });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.postedAt ?? b.fetchedAt).getTime() - (a.postedAt ?? a.fetchedAt).getTime(),
  );

  // The same role often appears on the company board and on aggregators.
  // Keep the first (best-scoring) copy, preferring the company's own board on ties.
  const seen = new Map<string, RankedJob>();
  for (const job of scored) {
    const key = `${job.company.toLowerCase().trim()}|${tokens(job.title).join(" ")}|${normalizePlace(job.location ?? "")}`;
    const existing = seen.get(key);
    if (!existing || (job.score === existing.score && job.applyViaAts && !existing.applyViaAts)) {
      seen.set(key, job);
    }
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}
