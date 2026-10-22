import type { Preferences } from "@/lib/profile";
import { userPlaces } from "./geo";

/**
 * Ready-made searches on big job sites whose terms don't allow other apps to read or apply on them
 * (Naukri, LinkedIn, Indeed, Shine, foundit). JobPilot never visits these sites itself; it only
 * opens the site's own search, filled in with the user's role and city, for them to apply there.
 */
export type ElsewhereLink = { site: string; url: string };

const INDEED_HOST: Record<string, string> = {
  india: "in.indeed.com", uk: "uk.indeed.com", canada: "ca.indeed.com", australia: "au.indeed.com",
  germany: "de.indeed.com", france: "fr.indeed.com", netherlands: "nl.indeed.com", spain: "es.indeed.com",
  ireland: "ie.indeed.com", singapore: "sg.indeed.com", uae: "ae.indeed.com", us: "www.indeed.com",
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function elsewhereLinks(role: string, prefs: Pick<Preferences, "locations" | "workModes">): ElsewhereLink[] {
  const places = userPlaces(prefs.locations);
  const country = [...places.countries][0] ?? null;
  const city = prefs.locations.find((l) => l.trim() && !/^(remote|anywhere|worldwide)$/i.test(l.trim()))?.trim() ?? "";
  const remoteOnly = prefs.workModes.length > 0 && prefs.workModes.every((m) => m === "remote");
  const q = role.trim();
  const enc = encodeURIComponent;
  const links: ElsewhereLink[] = [];

  const india = country === "india" || (!country && !city);
  if (india) {
    links.push({
      site: "Naukri",
      url: city ? `https://www.naukri.com/${slug(q)}-jobs-in-${slug(city)}` : `https://www.naukri.com/${slug(q)}-jobs`,
    });
  }
  links.push({
    site: "LinkedIn",
    url: `https://www.linkedin.com/jobs/search/?keywords=${enc(q)}${city ? `&location=${enc(city)}` : ""}${remoteOnly ? "&f_WT=2" : ""}`,
  });
  links.push({
    site: "Indeed",
    url: `https://${INDEED_HOST[country ?? "india"] ?? "www.indeed.com"}/jobs?q=${enc(q)}&l=${enc(remoteOnly ? "Remote" : city)}`,
  });
  if (india) {
    links.push({
      site: "Shine",
      url: city
        ? `https://www.shine.com/job-search/${slug(q)}-jobs-in-${slug(city)}`
        : `https://www.shine.com/job-search/${slug(q)}-jobs`,
    });
    links.push({
      site: "foundit",
      url: `https://www.foundit.in/srp/results?query=${enc(q)}${city ? `&locations=${enc(city)}` : ""}`,
    });
  }
  const where = remoteOnly ? " remote" : city ? ` in ${city}` : "";
  links.push({ site: "Google Jobs", url: `https://www.google.com/search?ibp=htl;jobs&q=${enc(`${q} jobs${where}`)}` });
  return links;
}
