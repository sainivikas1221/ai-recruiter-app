import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { markSentMyself, removeApplication, retryApplication } from "@/app/actions/apply";
import { AddOwnApplication } from "@/components/add-own-application";
import { AutoRefresh } from "@/components/auto-refresh";
import { STATUS_LABELS } from "@/lib/apply/labels";
import { kickQueue } from "@/lib/apply/runner";
import { requireUser } from "@/lib/auth/user";

const TONE: Record<string, string> = {
  submitted: "bg-accent-soft text-accent",
  applied: "bg-accent-soft text-accent",
  needs_you: "bg-warn-soft text-warn",
  failed: "bg-warn-soft text-warn",
};

export default async function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  const user = await requireUser();
  const { saved } = await searchParams;
  const apps = await db
    .select({
      id: schema.applications.id,
      company: schema.applications.company,
      title: schema.applications.title,
      url: schema.applications.url,
      appliedBy: schema.applications.appliedBy,
      status: schema.applications.status,
      note: schema.applications.note,
      hasScreenshot: sql<boolean>`${schema.applications.screenshot} is not null`,
      createdAt: schema.applications.createdAt,
      updatedAt: schema.applications.updatedAt,
    })
    .from(schema.applications)
    .where(eq(schema.applications.userId, user.id))
    .orderBy(desc(schema.applications.createdAt));

  const working = apps.some((a) => a.status === "queued" || a.status === "filling");
  // Pick up work left over from a restart.
  if (apps.some((a) => a.status === "queued")) void kickQueue();
  const count = (f: (a: (typeof apps)[number]) => boolean) => apps.filter(f).length;
  const stats = [
    { label: "Applied by JobPilot", value: count((a) => a.appliedBy === "jobpilot" && a.status === "submitted") },
    { label: "Applied by you", value: count((a) => a.appliedBy === "user") },
    { label: "Need you", value: count((a) => a.status === "needs_you" || a.status === "ready") },
    { label: "In progress", value: count((a) => a.status === "queued" || a.status === "filling") },
  ];
  const date = (d: Date) => d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      {working && <AutoRefresh />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Applied jobs</h1>
          <p className="text-sm text-muted">Every job you applied to, by JobPilot or by yourself.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/apply/review" className="btn-ghost">Application details</Link>
          <Link href="/jobs?auto=1" className="btn">Apply to more jobs</Link>
        </div>
      </div>
      {saved && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">Your application details are saved.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {apps.length === 0 ? (
        <div className="card text-center text-muted">
          <p>No applications yet.</p>
          <p className="text-sm">
            On <Link href="/jobs?auto=1" className="text-accent hover:underline">your jobs</Link>, tick the jobs you
            want JobPilot to apply to, or press &ldquo;Mark as applied by me&rdquo; on jobs you applied to yourself.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {apps.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-start gap-4 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                    {a.title}
                  </a>
                ) : (
                  <span className="font-semibold">{a.title}</span>
                )}
                <p className="text-sm text-muted">
                  {a.company} · {a.appliedBy === "jobpilot" ? "Applied by JobPilot" : "Applied by you"} ·{" "}
                  {date(a.status === "submitted" || a.status === "applied" ? a.updatedAt : a.createdAt)}
                </p>
                {a.note && a.status !== "submitted" && <p className="text-sm">{a.note}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 text-sm">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${TONE[a.status] ?? "bg-background"}`}>
                  {STATUS_LABELS[a.status]}
                </span>
                <div className="flex flex-wrap justify-end gap-3 text-xs">
                  {a.hasScreenshot && (
                    <a href={`/api/applications/${a.id}/screenshot`} target="_blank" className="text-accent hover:underline">
                      See the filled form
                    </a>
                  )}
                  {(a.status === "needs_you" || a.status === "ready" || a.status === "failed") && (
                    <form action={markSentMyself}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-accent hover:underline">I sent it myself</button>
                    </form>
                  )}
                  {a.appliedBy === "jobpilot" && (a.status === "needs_you" || a.status === "failed" || a.status === "ready") && (
                    <form action={retryApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-accent hover:underline">Try again</button>
                    </form>
                  )}
                  {a.status !== "filling" && (
                    <form action={removeApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-muted hover:underline">Remove</button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="card flex flex-col gap-3">
        <p className="font-semibold">Applied somewhere else?</p>
        <p className="text-sm text-muted">Add it here so all your applications are in one list.</p>
        <AddOwnApplication />
      </div>
    </div>
  );
}
