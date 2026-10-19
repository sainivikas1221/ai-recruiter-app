import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/user";
import { signOut } from "@/app/actions/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPilot",
  description: "Upload your resume, confirm what you want, and get jobs ranked for you.",
};

async function Nav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <nav className="flex items-center gap-3 text-sm">
        <Link href="/login" className="hover:underline">
          Sign in
        </Link>
        <Link href="/signup" className="btn py-1.5">
          Start free trial
        </Link>
      </nav>
    );
  }
  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/jobs" className="hover:underline">
        Jobs
      </Link>
      <Link href="/applications" className="hover:underline">
        Applied jobs
      </Link>
      <Link href="/preferences" className="hover:underline">
        Preferences
      </Link>
      <Link href="/onboarding" className="hover:underline">
        Resume
      </Link>
      <form action={signOut}>
        <button className="text-muted hover:underline">Sign out</button>
      </form>
    </nav>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              Job<span className="text-accent">Pilot</span>
            </Link>
            <Suspense>
              <Nav />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
