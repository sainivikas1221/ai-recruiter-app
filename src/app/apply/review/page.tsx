import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApplyForm } from "@/components/apply-form";
import { coverLetterFor } from "@/lib/ai/cover";
import { coverProfile, detailsOrSuggestion, getResumeFile } from "@/lib/apply/details";
import { canAutoApply } from "@/lib/apply/eligibility";
import { submitEnabled } from "@/lib/apply/runner";
import { requireUser } from "@/lib/auth/user";

export default async function ReviewPage({ searchParams }: PageProps<"/apply/review">) {
  const user = await requireUser();
  const { job } = await searchParams;
  const ids = [...new Set([job ?? []].flat())].slice(0, 50);
  const [jobs, { details }, resume] = await Promise.all([
    ids.length ? db.select().from(schema.jobs).where(inArray(schema.jobs.id, ids)) : [],
    detailsOrSuggestion(user),
    getResumeFile(user.id),
  ]);
  const chosen = jobs.filter(canAutoApply);
  const live = submitEnabled();
  // A cover letter for each job, from the resume and that job's description, ready to edit.
  const { profile, resumeText } = await coverProfile(user.id, details);
  const letters = await Promise.all(chosen.map((j) => coverLetterFor(j, profile, resumeText)));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{chosen.length ? "Check before JobPilot applies" : "Your application details"}</h1>
        <p className="text-muted">
          {chosen.length
            ? "These details and your resume go into each application form. Fix anything that isn't right."
            : "JobPilot uses these details and your resume to fill in application forms, and writes a cover letter for each job from your resume and the job description."}
        </p>
      </div>

      {ids.length > 0 && !chosen.length && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          None of the jobs you ticked can be applied to automatically.{" "}
          <Link href="/jobs?auto=1" className="underline">Pick jobs JobPilot can apply to</Link>.
        </p>
      )}

      {chosen.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="font-semibold">
            {chosen.length} {chosen.length === 1 ? "job" : "jobs"}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {chosen.map((j) => (
              <li key={j.id}>
                {j.title} <span className="text-muted">· {j.company}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {chosen.length > 0 && !live && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
          <span className="font-semibold">Test mode is on:</span> JobPilot fills in each form and shows you a picture
          of it on Applied jobs, but doesn&apos;t press Submit yet.
        </p>
      )}
      {chosen.length > 0 && !resume && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          We don&apos;t have your resume file yet, so forms that ask for one will need you.{" "}
          <Link href="/onboarding?add=resume" className="underline">Upload it again</Link> first.
        </p>
      )}

      <div className="card">
        <ApplyForm
          details={details}
          email={user.email}
          jobs={chosen.map((j, i) => ({ id: j.id, title: j.title, company: j.company, coverLetter: letters[i] }))}
          submitLabel={
            chosen.length
              ? `Auto-apply to ${chosen.length} ${chosen.length === 1 ? "job" : "jobs"}`
              : "Save details"
          }
        />
      </div>
      <p className="text-xs text-muted">
        If a site shows a CAPTCHA or asks something we can&apos;t answer, JobPilot stops and marks that job
        &ldquo;Needs you&rdquo; so you can finish it yourself.
      </p>
    </div>
  );
}
