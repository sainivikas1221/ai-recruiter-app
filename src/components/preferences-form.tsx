"use client";

import { useActionState } from "react";
import { updatePreferences } from "@/app/actions/preferences";
import {
  JOB_TYPE_LABELS,
  JOB_TYPES,
  WORK_MODE_LABELS,
  WORK_MODES,
  type Preferences,
} from "@/lib/profile";

// USD and INR first: most people pick one of these.
const CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD", "AUD", "SGD", "AED"];

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [state, formAction, pending] = useActionState(updatePreferences, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <label className="label" htmlFor="roles">Roles you want</label>
        <input className="input" id="roles" name="roles" defaultValue={initial.roles.join(", ")} required />
        <p className="mt-1 text-xs text-muted">Separate with commas, most important first.</p>
      </div>

      <fieldset>
        <legend className="label">Job type</legend>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((t) => (
            <label key={t} className="chip">
              <input type="checkbox" name="jobTypes" value={t} defaultChecked={initial.jobTypes.includes(t)} className="sr-only" />
              {JOB_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Where you want to work</legend>
        <div className="flex flex-wrap gap-2">
          {WORK_MODES.map((m) => (
            <label key={m} className="chip">
              <input type="checkbox" name="workModes" value={m} defaultChecked={initial.workModes.includes(m)} className="sr-only" />
              {WORK_MODE_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="locations">Cities or countries</label>
        <input
          className="input"
          id="locations"
          name="locations"
          defaultValue={initial.locations.join(", ")}
          placeholder="e.g. Bengaluru, London, Germany"
        />
        <p className="mt-1 text-xs text-muted">For hybrid and onsite jobs. Leave empty to see office jobs anywhere.</p>
      </div>

      <div>
        <span className="label">Expected annual salary</span>
        <div className="grid grid-cols-[6rem_1fr_1fr] gap-2">
          <select className="input" name="salaryCurrency" aria-label="Currency" defaultValue={initial.salaryCurrency ?? ""}>
            <option value="">Currency</option>
            {[...new Set([...CURRENCIES, ...(initial.salaryCurrency ? [initial.salaryCurrency] : [])])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input className="input" name="salaryMin" aria-label="Minimum" placeholder="Minimum" inputMode="numeric" defaultValue={initial.salaryMin ?? ""} />
          <input className="input" name="salaryTarget" aria-label="Target" placeholder="Target" inputMode="numeric" defaultValue={initial.salaryTarget ?? ""} />
        </div>
        <p className="mt-1 text-xs text-muted">
          Pick the currency first (USD for US dollars, INR for Indian rupees), then the yearly amounts in that currency.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="skills">Skills</label>
        <textarea className="input min-h-20" id="skills" name="skills" defaultValue={initial.skills.join(", ")} />
        <p className="mt-1 text-xs text-muted">Used to rank jobs that mention them.</p>
      </div>

      <div className="max-w-40">
        <label className="label" htmlFor="yearsExperience">Years of experience</label>
        <input className="input" id="yearsExperience" name="yearsExperience" inputMode="numeric" defaultValue={initial.yearsExperience ?? ""} />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {state.error}
        </p>
      )}
      <button className="btn self-start" disabled={pending}>
        {pending ? "Saving…" : "Find jobs"}
      </button>
    </form>
  );
}
