/**
 * Company career boards we read through each ATS's public job board API.
 * These APIs are published for other sites to read, so no scraping is involved.
 * Override the list with JOB_BOARDS, e.g. "greenhouse:stripe:Stripe,lever:palantir:Palantir".
 */
export type Board = { ats: "greenhouse" | "lever" | "ashby"; slug: string; company: string };

export const DEFAULT_BOARDS: Board[] = [
  { ats: "greenhouse", slug: "stripe", company: "Stripe" },
  { ats: "greenhouse", slug: "airbnb", company: "Airbnb" },
  { ats: "greenhouse", slug: "figma", company: "Figma" },
  { ats: "greenhouse", slug: "databricks", company: "Databricks" },
  { ats: "greenhouse", slug: "gitlab", company: "GitLab" },
  { ats: "greenhouse", slug: "cloudflare", company: "Cloudflare" },
  { ats: "greenhouse", slug: "coinbase", company: "Coinbase" },
  { ats: "greenhouse", slug: "dropbox", company: "Dropbox" },
  { ats: "greenhouse", slug: "reddit", company: "Reddit" },
  { ats: "greenhouse", slug: "anthropic", company: "Anthropic" },
  { ats: "lever", slug: "palantir", company: "Palantir" },
  { ats: "lever", slug: "spotify", company: "Spotify" },
  { ats: "lever", slug: "mistral", company: "Mistral AI" },
  // Companies hiring in India (boards checked to be live, 2026-10-22).
  { ats: "greenhouse", slug: "groww", company: "Groww" },
  { ats: "greenhouse", slug: "inmobi", company: "InMobi" },
  { ats: "greenhouse", slug: "druva", company: "Druva" },
  { ats: "lever", slug: "cred", company: "CRED" },
  { ats: "lever", slug: "meesho", company: "Meesho" },
  { ats: "lever", slug: "zeta", company: "Zeta" },
  { ats: "lever", slug: "pocketfm", company: "Pocket FM" },
  { ats: "lever", slug: "paytm", company: "Paytm" },
  { ats: "ashby", slug: "ramp", company: "Ramp" },
  { ats: "ashby", slug: "notion", company: "Notion" },
  { ats: "ashby", slug: "linear", company: "Linear" },
  { ats: "ashby", slug: "openai", company: "OpenAI" },
];

export function parseBoards(value: string | undefined): Board[] {
  if (!value?.trim()) return DEFAULT_BOARDS;
  return value
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter(
      (parts): parts is [Board["ats"], string, ...string[]] =>
        parts.length >= 2 && ["greenhouse", "lever", "ashby"].includes(parts[0]) && !!parts[1],
    )
    .map(([ats, slug, ...name]) => ({ ats, slug, company: name.join(":") || slug }));
}
