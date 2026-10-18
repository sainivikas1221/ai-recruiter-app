/** Career sites whose application forms JobPilot can fill in. */
const FORMS: Record<string, (account: string, id: string) => string> = {
  greenhouse: (board, id) => `https://job-boards.greenhouse.io/embed/job_app?for=${encodeURIComponent(board)}&token=${encodeURIComponent(id)}`,
  lever: (site, id) => `https://jobs.lever.co/${encodeURIComponent(site)}/${encodeURIComponent(id)}/apply`,
  ashby: (board, id) => `https://jobs.ashbyhq.com/${encodeURIComponent(board)}/${encodeURIComponent(id)}/application`,
};

export function canAutoApply(job: { source: string }) {
  return job.source in FORMS;
}

/** The page with the application form, or null when JobPilot can't fill this job's form. */
export function applicationFormUrl(job: { source: string; externalId: string }): string | null {
  const form = FORMS[job.source];
  const at = job.externalId.lastIndexOf(":");
  if (!form || at <= 0) return null;
  return form(job.externalId.slice(0, at), job.externalId.slice(at + 1));
}
