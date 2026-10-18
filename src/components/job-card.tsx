import type { RankedJob } from "@/lib/jobs/rank";

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  adzuna: "Adzuna",
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

export function JobCard({ job }: { job: RankedJob }) {
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
          via {SOURCE_LABELS[job.source] ?? job.source}
          {posted && ` · posted ${age(posted)}`}
        </p>
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
      </div>
    </li>
  );
}
