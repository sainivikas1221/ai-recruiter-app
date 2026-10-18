/** What application forms ask for beyond the resume. */
export type ApplicantDetails = {
  firstName: string;
  lastName: string;
  phone: string | null;
  city: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  currentCompany: string | null;
  authorizedToWork: boolean | null;
  needsSponsorship: boolean | null;
  noticePeriod: string | null;
  coverNote: string | null;
};

const PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d[\d\s-]{7,13}\d/;

/** A first draft of the details, read from documents the user already gave us. */
export function suggestDetails(name: string | null, text: string, city: string | null): ApplicantDetails {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const linkedin = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+/i.exec(text)?.[0] ?? null;
  const website =
    /(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[A-Za-z0-9_-]+|[a-z0-9-]+\.(?:dev|io|me|com)\/?[^\s,)]*)/i
      .exec(text.replace(/\S*linkedin\.com\S*/gi, "").replace(/\S+@\S+/g, ""))?.[0] ?? null;
  const phone = PHONE.exec(text.split("\n").slice(0, 25).join("\n"))?.[0].trim() ?? null;
  const withScheme = (u: string | null) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    phone: phone && phone.replace(/\D/g, "").length >= 8 ? phone : null,
    city,
    linkedinUrl: withScheme(linkedin),
    websiteUrl: withScheme(website),
    currentCompany: null,
    authorizedToWork: null,
    needsSponsorship: null,
    noticePeriod: null,
    coverNote: null,
  };
}
