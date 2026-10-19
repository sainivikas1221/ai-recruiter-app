"use client";

import { useActionState } from "react";
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
  jobIds,
  submitLabel,
}: {
  details: ApplicantDetails;
  email: string;
  jobIds: string[];
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
      {jobIds.map((id) => (
        <input key={id} type="hidden" name="job" value={id} />
      ))}
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
      <div>
        <label className="label" htmlFor="coverNote">Cover note</label>
        <textarea className="input min-h-40" id="coverNote" name="coverNote" defaultValue={details.coverNote ?? ""} />
        <p className="mt-1 text-xs text-muted">
          Written from your resume. For each job, JobPilot turns it into a cover letter for that company and role,
          and uses it where a form asks for a cover letter or why you&apos;re interested.
        </p>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{state.error}</p>
      )}
      <button className="btn self-start" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
