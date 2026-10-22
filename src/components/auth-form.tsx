"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "signin" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  initialError?: string;
};

export function AuthForm({ mode, action, initialError }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const error = state?.error ?? initialError;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
