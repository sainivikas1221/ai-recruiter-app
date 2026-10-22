import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";

const STEPS = [
  ["Upload your resume", "PDF or DOCX. We read your skills, experience and past roles."],
  ["Confirm what you want", "The AI suggests roles, job type, where you want to work and salary. You edit anything."],
  ["Get ranked jobs", "We search public company career boards and job APIs, and rank every match with the reasons why."],
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/jobs");
  return (
    <div className="flex flex-col gap-12 py-8">
      <section className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Your job search, done for you.</h1>
        <p className="text-lg text-muted">
          Upload your resume once. JobPilot works out what you&apos;re looking for, searches company
          career pages and job boards that welcome apps like ours, and shows you the best matches first.
        </p>
        <div className="flex gap-3">
          <Link href="/signup" className="btn">
            Start your free trial
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <div key={title} className="card flex flex-col gap-2">
            <span className="font-mono text-xs text-muted">{i + 1}</span>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
