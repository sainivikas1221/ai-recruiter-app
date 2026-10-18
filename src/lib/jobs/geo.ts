/**
 * Just enough geography to answer two questions for a user who says where they want to work:
 * is this job in one of their places, and is this remote job open to someone living there?
 */

// Spellings of the same city, plus metro areas people name as one place.
const CITY_GROUPS: string[][] = [
  ["gurgaon", "gurugram"],
  ["bangalore", "bengaluru"],
  ["delhi", "new delhi"],
  ["mumbai", "bombay", "navi mumbai"],
  ["chennai", "madras"],
  ["kolkata", "calcutta"],
  ["noida", "greater noida"],
];
const METROS: Record<string, string[]> = {
  "delhi ncr": ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "greater noida", "faridabad", "ghaziabad"],
  ncr: ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "greater noida", "faridabad", "ghaziabad"],
  "bay area": ["san francisco", "oakland", "san jose", "palo alto", "mountain view", "menlo park", "sunnyvale"],
};

// City → country, for cities people commonly name.
const CITY_COUNTRY: Record<string, string> = {
  gurgaon: "india", gurugram: "india", delhi: "india", "new delhi": "india", noida: "india",
  "greater noida": "india", faridabad: "india", ghaziabad: "india", bangalore: "india",
  bengaluru: "india", mumbai: "india", bombay: "india", "navi mumbai": "india", pune: "india",
  hyderabad: "india", chennai: "india", madras: "india", kolkata: "india", calcutta: "india",
  ahmedabad: "india", jaipur: "india", chandigarh: "india", kochi: "india", indore: "india",
  london: "uk", manchester: "uk", edinburgh: "uk", dublin: "ireland", berlin: "germany",
  munich: "germany", hamburg: "germany", paris: "france", amsterdam: "netherlands",
  madrid: "spain", barcelona: "spain", lisbon: "portugal", warsaw: "poland", zurich: "switzerland",
  stockholm: "sweden", "new york": "us", "san francisco": "us", seattle: "us", austin: "us",
  boston: "us", chicago: "us", "los angeles": "us", toronto: "canada", vancouver: "canada",
  singapore: "singapore", dubai: "uae", "abu dhabi": "uae", sydney: "australia",
  melbourne: "australia", tokyo: "japan",
};

// How each country is written in job locations, and the wider regions it belongs to.
const COUNTRIES: Record<string, { names: RegExp[]; regions: string[] }> = {
  india: { names: [/\bindia\b/i], regions: ["asia", "apac", "south asia"] },
  us: { names: [/\bunited states\b|\busa\b|\bamerica\b/i, /\bU\.S\.?|\bUS\b/], regions: ["americas", "north america"] },
  canada: { names: [/\bcanada\b/i], regions: ["americas", "north america"] },
  uk: { names: [/\bunited kingdom\b|\bengland\b|\bbritain\b|\bscotland\b/i, /\bU\.K\.?|\bUK\b/], regions: ["europe", "emea"] },
  ireland: { names: [/\bireland\b/i], regions: ["europe", "emea"] },
  germany: { names: [/\bgermany\b|\bdeutschland\b/i], regions: ["europe", "emea", "eu"] },
  france: { names: [/\bfrance\b/i], regions: ["europe", "emea", "eu"] },
  netherlands: { names: [/\bnetherlands\b/i], regions: ["europe", "emea", "eu"] },
  spain: { names: [/\bspain\b/i], regions: ["europe", "emea", "eu"] },
  portugal: { names: [/\bportugal\b/i], regions: ["europe", "emea", "eu"] },
  poland: { names: [/\bpoland\b/i], regions: ["europe", "emea", "eu"] },
  switzerland: { names: [/\bswitzerland\b/i], regions: ["europe", "emea"] },
  sweden: { names: [/\bsweden\b/i], regions: ["europe", "emea", "eu"] },
  singapore: { names: [/\bsingapore\b/i], regions: ["asia", "apac"] },
  uae: { names: [/\buae\b|\bunited arab emirates\b/i], regions: ["emea", "middle east"] },
  australia: { names: [/\baustralia\b/i], regions: ["apac", "oceania"] },
  japan: { names: [/\bjapan\b/i], regions: ["asia", "apac"] },
  brazil: { names: [/\bbrazil\b/i], regions: ["americas", "latam", "latin america", "south america"] },
  mexico: { names: [/\bmexico\b/i], regions: ["americas", "latam", "latin america", "north america"] },
};

const REGION_WORDS = [
  "europe", "emea", "eu", "americas", "north america", "south america", "latam", "latin america",
  "asia", "apac", "south asia", "middle east", "oceania",
];
const ANYWHERE = /worldwide|anywhere|global|international|all countries|any location/i;

/** Adzuna's country codes, for searching where the user lives. */
export const ADZUNA_COUNTRY: Record<string, string> = {
  india: "in", us: "us", uk: "gb", canada: "ca", australia: "au", germany: "de", france: "fr",
  netherlands: "nl", spain: "es", poland: "pl", switzerland: "ch", singapore: "sg", brazil: "br",
  mexico: "mx",
};

function norm(s: string) {
  return ` ${s.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

function mentions(text: string, place: string) {
  return norm(text).includes(` ${place} `);
}

export type UserPlaces = { cities: Set<string>; countries: Set<string>; label: string };

/** Expands what the user typed ("Gurgaon", "Delhi NCR", "India") into matchable places. */
export function userPlaces(locations: string[]): UserPlaces {
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const raw of locations) {
    const place = norm(raw).trim();
    if (!place) continue;
    const country = Object.entries(COUNTRIES).find(([, c]) => c.names.some((r) => r.test(raw)))?.[0];
    if (country && !CITY_COUNTRY[place]) {
      countries.add(country);
      continue;
    }
    const group = METROS[place] ?? CITY_GROUPS.find((g) => g.includes(place)) ?? [place];
    for (const c of group) {
      cities.add(c);
      if (CITY_COUNTRY[c]) countries.add(CITY_COUNTRY[c]);
    }
  }
  return { cities, countries, label: locations.join(", ") };
}

export function countriesIn(text: string): string[] {
  const found = new Set<string>();
  for (const [country, c] of Object.entries(COUNTRIES)) if (c.names.some((r) => r.test(text))) found.add(country);
  for (const [city, country] of Object.entries(CITY_COUNTRY)) if (mentions(text, city)) found.add(country);
  return [...found];
}

/** Whether an on-site or hybrid job is in one of the user's places. */
export function inUserPlace(jobLocation: string | null, user: UserPlaces): "city" | "country" | null {
  if (!jobLocation) return null;
  for (const city of user.cities) if (mentions(jobLocation, city)) return "city";
  if (countriesIn(jobLocation).some((c) => user.countries.has(c))) return "country";
  return null;
}

/**
 * Whether someone living in the user's places can take this remote job.
 * "worldwide" when it is open anywhere, "country" when it names their country or region,
 * false when it is limited to somewhere else.
 */
export function remoteOpenTo(jobLocation: string | null, user: UserPlaces): "worldwide" | "country" | false {
  const text = (jobLocation ?? "").trim();
  if (!text || /^remote$/i.test(text) || ANYWHERE.test(text)) return "worldwide";
  if (!user.countries.size) return "worldwide";

  const jobCountries = countriesIn(text);
  if (jobCountries.some((c) => user.countries.has(c))) return "country";
  const userRegions = new Set([...user.countries].flatMap((c) => COUNTRIES[c]?.regions ?? []));
  const jobRegions = REGION_WORDS.filter((r) => mentions(text, r));
  if (jobRegions.some((r) => userRegions.has(r))) return "country";
  if (jobCountries.length || jobRegions.length) return false;
  // A place we don't recognize: leave it in rather than hide a job by mistake.
  return "worldwide";
}
