"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmApply } from "@/app/actions/apply";
import type { ApplicantDetails } from "@/lib/apply/suggest";

function YesNo({ name, label, value }: { name: string; label: string; value: boolean | null }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select className="input" id={name} name={name} defaultValue={value === null ? "" : value ? "yes" : "no"}>
        <option value="">Ask me each time</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
}

export function ApplyForm({
  details,
  email,
  jobs,
  submitLabel,
}: {
  details: ApplicantDetails;
  email: string;
  jobs: { id: string; title: string; company: string; coverLetter: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(confirmApply, undefined);
  const text = (name: keyof ApplicantDetails, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} defaultValue={(details[name] as string | null) ?? ""} {...props} />
    </div>
  );
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {jobs.map((j) => (
        <input key={j.id} type="hidden" name="job" value={j.id} />
      ))}
      <input type="hidden" name="coverNote" value={details.coverNote ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        {text("firstName", "First name", { required: true })}
        {text("lastName", "Last name", { required: true })}
        <div>
          <span className="label">Email</span>
          <p className="input bg-transparent text-muted">{email}</p>
        </div>
        {text("phone", "Phone (with country code)", { type: "tel" })}
        {text("city", "City you live in")}
        {text("currentCompany", "Current company")}
        {text("linkedinUrl", "LinkedIn profile link", { placeholder: "https://www.linkedin.com/in/…" })}
        {text("websiteUrl", "Website or portfolio (optional)")}
        <YesNo name="authorizedToWork" label="Allowed to work in the job's country?" value={details.authorizedToWork} />
        <YesNo name="needsSponsorship" label="Need visa sponsorship?" value={details.needsSponsorship} />
        {text("noticePeriod", "Notice period / when you can start", { placeholder: "e.g. 30 days" })}
      </div>
      {jobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="label">Cover letters</p>
            <p className="text-xs text-muted">
              Written for each job from your resume and the job description. Change anything you like.
            </p>
          </div>
          {jobs.map((j, i) => (
            <details key={j.id} open={i === 0} className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {j.title} · {j.company}
              </summary>
              <textarea
                className="input mt-2 min-h-64"
                name={`cover:${j.id}`}
                aria-label={`Cover letter for ${j.title} at ${j.company}`}
                defaultValue={j.coverLetter}
              />
            </details>
          ))}
        </div>
      )}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {state.error}
          {state.needsCredits && (
            <>
              {" "}
              <Link href="/credits" className="font-semibold underline">Buy credits</Link>
            </>
          )}
        </p>
      )}
      <button className="btn self-start" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
