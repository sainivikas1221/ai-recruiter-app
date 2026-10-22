const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'",
};

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Plain text from an HTML job description (which may itself be entity-escaped). */
export function htmlToText(html: string | null | undefined, maxLength = 8000): string | null {
  if (!html) return null;
  let s = html.includes("&lt;") ? decodeEntities(html) : html;
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)\s*>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  s = decodeEntities(s).replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

export function workModeFrom(text: string | null | undefined): "remote" | "hybrid" | "onsite" | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\bhybrid\b/.test(t)) return "hybrid";
  if (/\bremote\b|anywhere|work from home|\bwfh\b/.test(t)) return "remote";
  if (/on-?site|in[- ]office/.test(t)) return "onsite";
  return null;
}

export function toDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parses free-text salaries like "$120k - $150k", "USD 90,000-110,000" or "€50.000".
 * Returns annual amounts; hourly and monthly figures are converted.
 */
export function parseSalaryText(text: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  const none = { min: null, max: null, currency: null };
  if (!text) return none;
  const t = text.toLowerCase();

  const currency = /\$|usd/.test(t)
    ? "USD"
    : /€|eur/.test(t)
      ? "EUR"
      : /£|gbp/.test(t)
        ? "GBP"
        : /₹|inr|lpa/.test(t)
          ? "INR"
          : /cad/.test(t)
            ? "CAD"
            : null;

  // In a range like "3 - 4.5 lakh" or "80-100k" the unit is written once, after the last number.
  const matches = [...t.matchAll(/(\d[\d,.]*)\s*(k|lpa|lakhs?|l\b)?/g)];
  const units = matches.map((m) => m[2]);
  for (let i = units.length - 2; i >= 0; i--) units[i] ??= units[i + 1];
  const numbers = matches
    .map((m, i) => {
      const raw = m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(/,/g, "");
      let n = Number(raw);
      if (!Number.isFinite(n) || n === 0) return null;
      const unit = units[i];
      if (unit === "k") n *= 1000;
      if (unit && unit !== "k") n *= 100000;
      return n;
    })
    .filter((n): n is number => n !== null);
  if (!numbers.length) return none;

  let factor = 1;
  if (/hour|\/hr|per hr/.test(t)) factor = 2080;
  else if (/month|\/mo/.test(t)) factor = 12;

  const values = numbers.map((n) => Math.round(n * factor)).filter((n) => n >= 1000);
  if (!values.length) return none;
  return { min: Math.min(...values), max: Math.max(...values), currency };
}
