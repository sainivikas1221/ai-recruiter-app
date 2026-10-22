/** What a cover letter can say about the person, all taken from their resume and preferences. */
export type CoverProfile = {
  name: string;
  role: string | null;
  years: number | null;
  currentCompany: string | null;
  skills: string[];
};

export type CoverJob = { company: string; title: string; description: string | null };

function joinList(xs: string[]) {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The person's skills that this job's description asks for, most relevant first. */
export function skillsTheJobWants(skills: string[], description: string | null): string[] {
  if (!description) return [];
  const text = description.toLowerCase();
  return skills
    .map((s) => ({ s, at: text.search(new RegExp(`(^|[^a-z0-9])${escapeRegExp(s.toLowerCase())}(?![a-z0-9])`)) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.s);
}

/**
 * A complete cover letter built from the resume and the job description, for when no AI is
 * available. Says only what the person's own documents support.
 */
export function templateCoverLetter(p: CoverProfile, job: CoverJob): string {
  const wanted = skillsTheJobWants(p.skills, job.description).slice(0, 4);
  const others = p.skills.filter((s) => !wanted.includes(s)).slice(0, 4 - Math.min(wanted.length, 3));
  const who = [
    p.role ? `a ${p.role}` : "a professional",
    p.years ? ` with ${p.years} years of experience` : "",
    p.currentCompany ? `, currently at ${p.currentCompany}` : "",
  ].join("");

  const paragraphs = [
    `Dear ${job.company} hiring team,`,
    `I'm excited to apply for the ${job.title} role at ${job.company}. I'm ${who}, and this role is a close match for the work I do and want to keep doing.`,
    wanted.length
      ? `Your description calls for ${joinList(wanted)}. These are at the core of my day-to-day work${others.length ? `, alongside ${joinList(others)}` : ""}, so I can contribute from the first weeks rather than months in.`
      : p.skills.length
        ? `My work centres on ${joinList(p.skills.slice(0, 4))}, and I'm used to picking up whatever a new team needs to deliver.`
        : "",
    `I care about clear ownership and measurable results, and I'd bring that to ${job.company}. I'd welcome the chance to talk about how I can help your team.`,
    `Best regards,\n${p.name}`,
  ];
  return paragraphs.filter(Boolean).join("\n\n");
}
