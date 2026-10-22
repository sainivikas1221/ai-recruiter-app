import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import { findResetToken } from "@/lib/auth/reset";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && (await findResetToken(token));
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <div className="card flex flex-col gap-4">
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm">
            This link has expired or was already used.{" "}
            <Link href="/forgot-password" className="text-accent hover:underline">
              Ask for a new one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
