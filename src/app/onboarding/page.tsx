import Link from "next/link";
import { ResumeUpload } from "@/components/resume-upload";
import { requireUser } from "@/lib/auth/user";
import { getLatestResume } from "@/lib/preferences";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser();
  const [resume, { add }] = await Promise.all([getLatestResume(user.id), searchParams]);
  // LinkedIn sign-in shares only name and email, so the profile comes from LinkedIn's own PDF export.
  const fromLinkedIn = add === "linkedin" || (user.linkedin && !resume && add !== "resume");
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs text-muted uppercase">Step 1 of 2</p>
        <h1 className="text-2xl font-bold">
          {fromLinkedIn
            ? "Import your LinkedIn profile"
            : add === "resume"
              ? "Add your resume"
              : resume
                ? "Upload a new resume"
                : "Upload your resume"}
        </h1>
        <p className="text-muted">
          We&apos;ll pull out your skills, experience and the roles you fit, then suggest what to search for.
        </p>
      </div>
      {add && (
        <p className="text-sm text-muted">
          We&apos;ll read it together with what you already uploaded and fill in your preferences from both.
        </p>
      )}
      {resume && !add && (
        <p className="text-sm text-muted">
          Current resume: <span className="text-foreground">{resume.fileName}</span>, uploaded{" "}
          {resume.createdAt.toLocaleDateString("en", { dateStyle: "medium" })}. Uploading a new one
          replaces your suggested preferences.
        </p>
      )}
      {fromLinkedIn && (
        <ol className="card flex flex-col gap-3 text-sm">
          <li>
            <span className="font-semibold">1.</span>{" "}
            <a
              href="https://www.linkedin.com/in/me/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost inline-flex px-3 py-1"
            >
              Open my LinkedIn profile
            </a>
          </li>
          <li>
            <span className="font-semibold">2.</span> On your profile, click{" "}
            <span className="font-semibold">Resources</span> (or <span className="font-semibold">More</span>), then{" "}
            <span className="font-semibold">Save to PDF</span>. LinkedIn downloads your profile as a file.
          </li>
          <li>
            <span className="font-semibold">3.</span> Drop that file below (it&apos;s in your Downloads folder, named
            Profile.pdf).
          </li>
        </ol>
      )}
      <div className="card">
        <ResumeUpload />
      </div>
      {!fromLinkedIn && (
        <p className="text-sm text-muted">
          No resume handy? Use your LinkedIn profile: open your profile on linkedin.com, click{" "}
          <span className="text-foreground">Resources</span> (or <span className="text-foreground">More</span>), then{" "}
          <span className="text-foreground">Save to PDF</span>, and upload that file here.
        </p>
      )}
      <p className="text-sm text-muted">
        Prefer to skip this?{" "}
        <Link href="/preferences" className="text-accent hover:underline">
          Fill in what you&apos;re looking for yourself
        </Link>
        .
      </p>
      <p className="text-xs text-muted">
        We keep the text of your resume to match you with jobs, not the file itself. You can delete
        your account and data at any time.
      </p>
    </div>
  );
}
