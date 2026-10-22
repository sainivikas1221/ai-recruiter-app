import Link from "next/link";
import { KeysForm } from "@/components/keys-form";
import { requireUser } from "@/lib/auth/user";
import { canEditSearchKeys, SEARCH_KEYS, searchKeyStatus } from "@/lib/search-keys";

const STEPS = [
  {
    name: "Google Jobs (widest: jobs from Naukri, LinkedIn, Indeed, Shine and company sites)",
    url: "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch",
    how: "Sign up, press Subscribe to Test, pick the Basic (free) plan, then copy X-RapidAPI-Key from the page.",
  },
  {
    name: "Adzuna (India and ~20 other countries)",
    url: "https://developer.adzuna.com/signup",
    how: "Register, then open Dashboard → API Access Details and copy the App ID and App Key.",
  },
  {
    name: "Jooble (India and ~70 other countries)",
    url: "https://jooble.org/api/about",
    how: "Fill in the short form. Jooble emails you the key.",
  },
];

export default async function KeysPage({ searchParams }: PageProps<"/settings/keys">) {
  await requireUser();
  const { saved } = await searchParams;
  const status = searchKeyStatus();
  const fields = SEARCH_KEYS.map((k) => ({ name: k.name, label: k.label, set: status[k.name] }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Find more jobs</h1>
        <p className="text-sm text-muted">
          Free keys from these job search services let JobPilot search far more jobs, in India and worldwide.
          Each takes a few minutes and costs nothing.
        </p>
      </div>
      {saved && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
          Saved. <Link href="/jobs" className="text-accent hover:underline">Search jobs now</Link>
        </p>
      )}
      <ol className="card flex list-decimal flex-col gap-3 pl-8 text-sm">
        {STEPS.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
              {s.name} ↗
            </a>
            <p className="text-muted">{s.how}</p>
          </li>
        ))}
      </ol>
      <section className="card">
        {canEditSearchKeys() ? (
          <KeysForm fields={fields} />
        ) : (
          <p className="text-sm text-muted">
            On a hosted site, keys are set in the hosting panel&apos;s environment variables:{" "}
            {SEARCH_KEYS.map((k) => k.name).join(", ")}.
          </p>
        )}
      </section>
    </div>
  );
}
