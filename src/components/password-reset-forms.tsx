"use client";

import { useActionState } from "react";
import { requestPasswordReset, resetPassword } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.sent) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p>If an account uses that email, a link to set a new password is on its way. Check your inbox and spam folder.</p>
        {state.link && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-warn">
            Email isn&apos;t set up on this computer, so here is the link:{" "}
            <a href={state.link} className="break-all text-accent hover:underline">
              Set a new password
            </a>
          </p>
        )}
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {state.error}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "One moment…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {state.error}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "One moment…" : "Save new password"}
      </button>
    </form>
  );
}
