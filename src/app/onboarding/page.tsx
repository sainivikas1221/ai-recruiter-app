import { ResumeUpload } from "@/components/resume-upload";
import { requireUser } from "@/lib/auth/user";
import { getLatestResume } from "@/lib/preferences";

export default async function OnboardingPage() {
  const user = await requireUser();
  const resume = await getLatestResume(user.id);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs text-muted uppercase">Step 1 of 2</p>
        <h1 className="text-2xl font-bold">{resume ? "Upload a new resume" : "Upload your resume"}</h1>
        <p className="text-muted">
          We&apos;ll pull out your skills, experience and the roles you fit, then suggest what to search for.
        </p>
      </div>
      {resume && (
        <p className="text-sm text-muted">
          Current resume: <span className="text-foreground">{resume.fileName}</span>, uploaded{" "}
          {resume.createdAt.toLocaleDateString("en", { dateStyle: "medium" })}. Uploading a new one
          replaces your suggested preferences.
        </p>
      )}
      <div className="card">
        <ResumeUpload />
      </div>
      <p className="text-xs text-muted">
        We keep the text of your resume to match you with jobs, not the file itself. You can delete
        your account and data at any time.
      </p>
    </div>
  );
}
