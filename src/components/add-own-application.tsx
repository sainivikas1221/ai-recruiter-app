"use client";

import { useActionState } from "react";
import { addOwnApplication } from "@/app/actions/apply";

export function AddOwnApplication() {
  const [state, formAction, pending] = useActionState(addOwnApplication, undefined);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="company">Company</label>
        <input className="input" id="company" name="company" required />
      </div>
      <div>
        <label className="label" htmlFor="title">Job title</label>
        <input className="input" id="title" name="title" required />
      </div>
      <div>
        <label className="label" htmlFor="url">Link (optional)</label>
        <input className="input" id="url" name="url" placeholder="https://" />
      </div>
      <button className="btn" disabled={pending}>Add</button>
      {state?.error && <p role="alert" className="text-sm text-warn sm:col-span-4">{state.error}</p>}
    </form>
  );
}
