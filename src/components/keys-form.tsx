"use client";

import { useActionState } from "react";
import { saveKeys } from "@/app/actions/keys";

type Field = { name: string; label: string; set: boolean };

export function KeysForm({ fields }: { fields: Field[] }) {
  const [state, action, pending] = useActionState(saveKeys, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {f.label} {f.set && <span className="text-accent">· saved ✓</span>}
          </span>
          <input
            name={f.name}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={f.set ? "Saved. Paste a new one to replace it" : "Paste here"}
            className="input"
          />
        </label>
      ))}
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <button className="btn self-start" disabled={pending}>
        {pending ? "Saving…" : "Save keys"}
      </button>
    </form>
  );
}
