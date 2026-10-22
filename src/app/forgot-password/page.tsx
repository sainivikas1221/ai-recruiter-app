import Link from "next/link";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="text-sm text-muted">Enter your email and we&apos;ll send you a link to set a new one.</p>
      </div>
      <div className="card flex flex-col gap-4">
        <ForgotPasswordForm />
      </div>
      <p className="text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
