import "server-only";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Preferences } from "@/lib/profile";
import { parseBoards } from "./boards";
import { rankJobs, type RankedJob } from "./rank";
import type { FetchJson, NormalizedJob } from "./types";
import { fetchGreenhouse } from "./sources/greenhouse";
import { fetchLever } from "./sources/lever";
import { fetchAshby } from "./sources/ashby";
import { fetchRemotive } from "./sources/remotive";
import { fetchArbeitnow } from "./sources/arbeitnow";
import { adzunaEnabled, fetchAdzuna } from "./sources/adzuna";
import { ADZUNA_COUNTRY, userPlaces } from "./geo";

/** How long a feed's results are reused before we read it again. */
const FEED_TTL_MS = 6 * 60 * 60 * 1000;
/** Jobs older than this are not shown. */
const MAX_JOB_AGE_DAYS = 45;

const fetchJson: FetchJson = async (url) => {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "JobPilot/0.1 (job search app)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

type Feed = { key: string; load: () => Promise<NormalizedJob[]> };

function feedsFor(prefs: Preferences): Feed[] {
  const feeds: Feed[] = parseBoards(process.env.JOB_BOARDS).map((b) => ({
    key: `${b.ats}:${b.slug}`,
    load: () =>
      b.ats === "greenhouse"
        ? fetchGreenhouse(b.slug, b.company, fetchJson)
        : b.ats === "lever"
          ? fetchLever(b.slug, b.company, fetchJson)
          : fetchAshby(b.slug, b.company, fetchJson),
  }));

  feeds.push({ key: "arbeitnow", load: () => fetchArbeitnow(fetchJson) });

  // Adzuna searches one country at a time: the one the user picked, unless the host pins one.
  const places = userPlaces(prefs.locations);
  const userCountry = [...places.countries].map((c) => ADZUNA_COUNTRY[c]).find(Boolean);
  const country = (process.env.ADZUNA_COUNTRY ?? userCountry ?? "us").toLowerCase();
  const where = places.cities.size ? prefs.locations.find((l) => !/^(remote|anywhere)$/i.test(l.trim())) ?? null : null;

  for (const role of prefs.roles.slice(0, 3)) {
    const q = role.toLowerCase();
    feeds.push({ key: `remotive:${q}`, load: () => fetchRemotive(q, fetchJson) });
    if (adzunaEnabled()) {
      feeds.push({
        key: `adzuna:${country}:${q}:${where ?? ""}`.toLowerCase(),
        load: () => fetchAdzuna(q, where, country, fetchJson),
      });
    }
  }
  return feeds;
}

async function saveJobs(found: NormalizedJob[]) {
  const now = new Date();
  // Insert in chunks to stay well under Postgres's parameter limit.
  for (let i = 0; i < found.length; i += 500) {
    const rows = found.slice(i, i + 500).map((j) => ({
      id: `${j.source}:${j.externalId}`,
      ...j,
      fetchedAt: now,
    }));
    await db
      .insert(schema.jobs)
      .values(rows)
      .onConflictDoUpdate({
        target: schema.jobs.id,
        set: {
          title: sql`excluded.title`,
          location: sql`excluded.location`,
          workMode: sql`excluded.work_mode`,
          employmentType: sql`excluded.employment_type`,
          salaryMin: sql`excluded.salary_min`,
          salaryMax: sql`excluded.salary_max`,
          salaryCurrency: sql`excluded.salary_currency`,
          description: sql`excluded.description`,
          url: sql`excluded.url`,
          fetchedAt: sql`excluded.fetched_at`,
        },
      });
  }
}

export type FeedStatus = { key: string; ok: boolean; jobCount: number; error: string | null };

/** Reads every feed whose cached copy is stale. Failures are recorded, never thrown. */
export async function refreshFeeds(prefs: Preferences, force = false): Promise<FeedStatus[]> {
  const feeds = feedsFor(prefs);
  const keys = feeds.map((f) => f.key);
  const fresh = force
    ? []
    : await db
        .select({ key: schema.sourceRuns.key })
        .from(schema.sourceRuns)
        .where(
          and(
            inArray(schema.sourceRuns.key, keys),
            eq(schema.sourceRuns.ok, true),
            gt(schema.sourceRuns.ranAt, new Date(Date.now() - FEED_TTL_MS)),
          ),
        );
  const freshKeys = new Set(fresh.map((r) => r.key));
  const stale = feeds.filter((f) => !freshKeys.has(f.key));

  const results = await Promise.all(
    stale.map(async (feed): Promise<FeedStatus> => {
      try {
        const found = await feed.load();
        await saveJobs(found);
        return { key: feed.key, ok: true, jobCount: found.length, error: null };
      } catch (err) {
        return { key: feed.key, ok: false, jobCount: 0, error: String((err as Error).message ?? err) };
      }
    }),
  );

  if (results.length) {
    const ranAt = new Date();
    await db
      .insert(schema.sourceRuns)
      .values(results.map((r) => ({ ...r, ranAt })))
      .onConflictDoUpdate({
        target: schema.sourceRuns.key,
        set: {
          ranAt: sql`excluded.ran_at`,
          ok: sql`excluded.ok`,
          jobCount: sql`excluded.job_count`,
          error: sql`excluded.error`,
        },
      });
  }
  return results;
}

/** Refreshes stale feeds, then ranks every recent job against the user's preferences. */
export async function searchJobs(prefs: Preferences, opts: { force?: boolean } = {}) {
  const feedResults = await refreshFeeds(prefs, opts.force);
  const since = new Date(Date.now() - MAX_JOB_AGE_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(schema.jobs)
    .where(sql`coalesce(${schema.jobs.postedAt}, ${schema.jobs.fetchedAt}) > ${since}`);

  const ranked: RankedJob[] = rankJobs(rows, prefs);
  return { jobs: ranked, feedResults, scanned: rows.length };
}
