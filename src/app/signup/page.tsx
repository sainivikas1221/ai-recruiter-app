import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { OAuthButtons } from "@/components/oauth-buttons";
import { getCurrentUser, TRIAL_DAYS } from "@/lib/auth/user";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/jobs");
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted">Free for {TRIAL_DAYS} days. No card needed.</p>
      </div>
      <div className="card flex flex-col gap-4">
        <OAuthButtons />
        <AuthForm mode="signup" action={signUp} />
      </div>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
