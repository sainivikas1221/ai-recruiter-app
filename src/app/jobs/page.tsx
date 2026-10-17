import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { refreshJobs } from "@/app/actions/jobs";
import { JobCard } from "@/components/job-card";
import { requireUser } from "@/lib/auth/user";
import { searchJobs } from "@/lib/jobs/search";
import { getPreferences } from "@/lib/preferences";
import type { Preferences } from "@/lib/profile";

const PAGE_SIZE = 50;

type Filters = { remoteOnly: boolean; minScore: number; limit: number };

function filtersFrom(params: Record<string, string | string[] | undefined>): Filters {
  const num = (v: unknown, d: number) => (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : d);
  return {
    remoteOnly: params.remote === "1",
    minScore: Math.min(100, num(params.min, 0)),
    limit: Math.min(500, num(params.limit, PAGE_SIZE)),
  };
}

function href(f: Filters, change: Partial<Filters>) {
  const next = { ...f, ...change };
  const q = new URLSearchParams();
  if (next.remoteOnly) q.set("remote", "1");
  if (next.minScore) q.set("min", String(next.minScore));
  if (next.limit !== PAGE_SIZE) q.set("limit", String(next.limit));
  const s = q.toString();
  return s ? `/jobs?${s}` : "/jobs";
}

async function Results({ prefs, filters }: { prefs: Preferences; filters: Filters }) {
  const { jobs, feedResults } = await searchJobs(prefs);
  const failed = feedResults.filter((f) => !f.ok);
  const shown = jobs.filter(
    (j) => j.score >= filters.minScore && (!filters.remoteOnly || j.workMode === "remote"),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          {shown.length} {shown.length === 1 ? "job" : "jobs"} found
          <span className="font-normal text-muted"> · best match first</span>
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={href(filters, { remoteOnly: !filters.remoteOnly, limit: PAGE_SIZE })}
            className={`chip ${filters.remoteOnly ? "border-accent bg-accent-soft" : ""}`}
          >
            Remote only
          </Link>
          <Link
            href={href(filters, { minScore: filters.minScore === 70 ? 0 : 70, limit: PAGE_SIZE })}
            className={`chip ${filters.minScore === 70 ? "border-accent bg-accent-soft" : ""}`}
          >
            Strong matches (70%+)
          </Link>
        </div>
      </div>

      {failed.length > 0 && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {failed.length === feedResults.length
            ? "We couldn't reach the job sources just now, so these results are from earlier searches. Try Search again in a few minutes."
            : `${failed.length} of ${feedResults.length} job sources couldn't be reached just now, so a few jobs may be missing.`}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="card text-center text-muted">
          <p>No matching jobs yet.</p>
          <p className="text-sm">
            Try adding more roles or allowing remote work on your{" "}
            <Link href="/preferences" className="text-accent hover:underline">preferences</Link>.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.slice(0, filters.limit).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      )}
      {shown.length > filters.limit && (
        <Link href={href(filters, { limit: filters.limit + PAGE_SIZE })} className="btn-ghost self-center">
          Show more
        </Link>
      )}
    </div>
  );
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const user = await requireUser();
  const [prefs, params] = await Promise.all([getPreferences(user.id), searchParams]);
  if (!prefs || prefs.roles.length === 0) redirect("/onboarding");
  const filters = filtersFrom(params);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your jobs</h1>
          <p className="text-sm text-muted">
            {prefs.roles.join(", ")} ·{" "}
            <Link href="/preferences" className="text-accent hover:underline">Edit preferences</Link>
          </p>
        </div>
        <form action={refreshJobs}>
          <button className="btn-ghost text-sm">Search again</button>
        </form>
      </div>
      <Suspense
        key={JSON.stringify(filters)}
        fallback={
          <div className="card text-center text-muted">
            Searching company career pages and job boards…
          </div>
        }
      >
        <Results prefs={prefs} filters={filters} />
      </Suspense>
    </div>
  );
}
