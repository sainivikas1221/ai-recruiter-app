import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { OAuthButtons } from "@/components/oauth-buttons";
import { getCurrentUser } from "@/lib/auth/user";

const ERRORS: Record<string, string> = {
  google: "Google sign-in didn't complete. Please try again.",
  "google-email": "Your Google account needs a verified email address.",
  linkedin: "LinkedIn sign-in didn't complete. Please try again.",
  "linkedin-email": "Your LinkedIn account needs a verified email address.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/jobs");
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <div className="card flex flex-col gap-4">
        <OAuthButtons />
        <AuthForm
          mode="signin"
          action={signIn}
          initialError={typeof error === "string" ? ERRORS[error] : undefined}
        />
        <Link href="/forgot-password" className="self-start text-sm text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Start your free trial
        </Link>
      </p>
    </div>
  );
}
