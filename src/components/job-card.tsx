import { markApplied, unmarkApplied } from "@/app/actions/apply";
import type { RankedJob } from "@/lib/jobs/rank";
import type { ApplicationSummary } from "@/lib/apply/labels";
import type { ApplicationStatus } from "@/db/schema";

const JOBPILOT_STATUS: Record<ApplicationStatus, string> = {
  queued: "JobPilot is applying…",
  filling: "JobPilot is applying…",
  ready: "Filled in by JobPilot, not sent yet (test mode)",
  submitted: "✓ Applied by JobPilot",
  needs_you: "JobPilot needs you to finish this one (see Applied jobs)",
  failed: "JobPilot couldn't apply (see Applied jobs)",
  applied: "✓ Applied",
};

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  adzuna: "Adzuna",
  jsearch: "Google Jobs",
  jooble: "Jooble",
  himalayas: "Himalayas",
  jobicy: "Jobicy",
};

// Sources whose terms ask for a visible link back to them.
const SOURCE_HOMES: Record<string, string> = {
  remotive: "https://remotive.com",
  himalayas: "https://himalayas.app",
  jobicy: "https://jobicy.com",
};

function salary(job: RankedJob) {
  if (!job.salaryCurrency || (!job.salaryMin && !job.salaryMax)) return null;
  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: job.salaryCurrency!,
        notation: "compact",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${job.salaryCurrency} ${n.toLocaleString()}`;
    }
  };
  if (job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax) {
    return `${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`;
  }
  return fmt((job.salaryMax ?? job.salaryMin)!);
}

function age(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Rendered inside the jobs page's selection form; buttons post their own actions. */
export function JobCard({
  job,
  selectable,
  application,
}: {
  job: RankedJob;
  selectable: boolean;
  application: ApplicationSummary | null;
}) {
  const remote = job.workMode === "remote";
  const place = remote
    ? job.location && !/^remote$/i.test(job.location.trim())
      ? job.location.toLowerCase().includes("remote")
        ? job.location
        : `Remote · ${job.location}`
      : "Remote · Worldwide"
    : job.location;
  const meta = [
    job.company,
    place,
    job.workMode && job.workMode !== "remote" && !job.location?.toLowerCase().includes(job.workMode)
      ? job.workMode
      : null,
    salary(job),
  ].filter(Boolean);
  const posted = job.postedAt ?? null;
  return (
    <li className="card flex gap-4 p-4">
      {selectable && (
        <input
          type="checkbox"
          name="job"
          value={job.id}
          aria-label={`Select ${job.title} at ${job.company}`}
          disabled={application?.status === "applied" || application?.status === "submitted"}
          className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
          {job.title}
        </a>
        <p className="text-sm text-muted">{meta.join(" · ")}</p>
        {job.reasons.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {job.reasons.map((r) => (
              <li key={r} className="rounded bg-accent-soft px-2 py-0.5 text-xs">
                {r}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted">
          via{" "}
          {SOURCE_HOMES[job.source] ? (
            <a href={SOURCE_HOMES[job.source]} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {SOURCE_LABELS[job.source]}
            </a>
          ) : (
            (SOURCE_LABELS[job.source] ?? job.source)
          )}
          {posted && ` · posted ${age(posted)}`}

        </p>
        {application && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-accent">
            {application.appliedBy === "user" ? "You marked this as applied yourself" : JOBPILOT_STATUS[application.status]}
            {application.appliedBy === "user" && (
              <button formAction={unmarkApplied.bind(null, job.id)} className="font-normal text-muted hover:underline">
                Undo
              </button>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <span
          className="rounded-md bg-accent-soft px-2 py-1 font-mono text-sm"
          title="How well this job matches your preferences"
        >
          {job.score}%
        </span>
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1 text-sm whitespace-nowrap">
          View job
        </a>
        {selectable && !application && (
          // Plain submit: opens the review page for this job plus any others that are ticked.
          <button name="job" value={job.id} className="btn px-3 py-1 text-sm whitespace-nowrap">
            Auto-apply
          </button>
        )}
        {!application && (
          <button
            formAction={markApplied.bind(null, job.id)}
            className="text-xs text-muted hover:underline"
            title="Use this when you applied to this job yourself. JobPilot doesn't send anything."
          >
            Mark as applied by me
          </button>
        )}
      </div>
    </li>
  );
}
