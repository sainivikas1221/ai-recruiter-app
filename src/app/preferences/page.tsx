import Link from "next/link";
import { deleteAccount } from "@/app/actions/auth";
import { PreferencesForm } from "@/components/preferences-form";
import { requireUser } from "@/lib/auth/user";
import { getLatestDocuments, getLatestResume, getPreferences } from "@/lib/preferences";
import type { Preferences } from "@/lib/profile";

const EMPTY: Preferences = {
  roles: [],
  skills: [],
  jobTypes: ["full_time"],
  workModes: ["remote"],
  locations: [],
  salaryCurrency: null,
  salaryMin: null,
  salaryTarget: null,
  yearsExperience: null,
};

export default async function PreferencesPage({ searchParams }: PageProps<"/preferences">) {
  const user = await requireUser();
  const [prefs, resume, docs, params] = await Promise.all([
    getPreferences(user.id),
    getLatestResume(user.id),
    getLatestDocuments(user.id),
    searchParams,
  ]);
  const sources = docs.resume && docs.linkedin ? "your resume and LinkedIn profile" : docs.linkedin ? "your LinkedIn profile" : "your resume";
  const fromResume = params.from === "resume";
  const salaryEstimated = resume?.extracted?.salary?.isEstimate;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        {fromResume && <p className="font-mono text-xs text-muted uppercase">Step 2 of 2</p>}
        <h1 className="text-2xl font-bold">What you&apos;re looking for</h1>
        {fromResume && resume?.extractedBy === "claude" && (
          <p className="text-muted">
            Our AI filled these in from {sources}. Check them and change anything that isn&apos;t right.
            {salaryEstimated && " The salary is an estimate for your roles and location."}
          </p>
        )}
        {fromResume && resume?.extractedBy === "heuristic" && (
          <p className="text-muted">
            We filled in what we could from {sources}. Please check and complete the fields below.
          </p>
        )}
        {fromResume && (docs.resume ? !docs.linkedin : docs.linkedin) && (
          <p className="mt-2 text-sm text-muted">
            For better matches,{" "}
            <Link href={docs.linkedin ? "/onboarding?add=resume" : "/onboarding?add=linkedin"} className="text-accent hover:underline">
              {docs.linkedin ? "add your resume too" : "add your LinkedIn profile too"}
            </Link>
            . We&apos;ll combine both.
          </p>
        )}
        {!resume && (
          <p className="text-muted">
            <Link href="/onboarding" className="text-accent hover:underline">Upload your resume</Link>{" "}
            and we&apos;ll fill this in for you, or enter it yourself.
          </p>
        )}
      </div>
      <div className="card">
        <PreferencesForm initial={prefs ?? EMPTY} />
      </div>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer">Delete my account</summary>
        <form action={deleteAccount} className="mt-3 flex flex-col gap-2">
          <p>This permanently deletes your account, resume text and preferences.</p>
          {params.error === "confirm-delete" && (
            <p role="alert" className="text-warn">Type delete to confirm.</p>
          )}
          <div className="flex gap-2">
            <input className="input max-w-48" name="confirm" placeholder="Type delete" aria-label="Type delete to confirm" />
            <button className="btn-ghost text-warn">Delete account</button>
          </div>
        </form>
      </details>
    </div>
  );
}
