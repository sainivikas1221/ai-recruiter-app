import type { Preferences } from "@/lib/profile";
import { elsewhereLinks } from "@/lib/jobs/elsewhere";

/** Opens the same search on Naukri, LinkedIn, Indeed and the rest, for the user to apply there. */
export function SearchElsewhere({ prefs }: { prefs: Preferences }) {
  const roles = prefs.roles.slice(0, 3);
  if (!roles.length) return null;
  return (
    <section className="card flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">Search on more job sites</h2>
        <p className="text-sm text-muted">
          Naukri, LinkedIn, Indeed and Shine don&apos;t let other apps read or apply on them, so JobPilot opens
          their own search for you, already filled in. Apply there directly.
        </p>
      </div>
      {roles.map((role) => (
        <div key={role} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-full font-medium sm:w-44">{role}</span>
          {elsewhereLinks(role, prefs).map((l) => (
            <a key={l.site} href={l.url} target="_blank" rel="noopener noreferrer" className="chip hover:border-accent">
              {l.site} ↗
            </a>
          ))}
        </div>
      ))}
    </section>
  );
}
