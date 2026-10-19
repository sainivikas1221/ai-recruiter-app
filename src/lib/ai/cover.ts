import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const SYSTEM = `You write short cover letters that job seekers send with an application.
Write in the person's own voice, first person, plain text, 120 to 180 words, no greeting line and no sign-off.
Use only facts from the resume and the person's own note. Never invent employers, numbers, degrees or skills.
Connect two or three of their strongest, most relevant experiences to what this job asks for, and name the company once.`;

export type CoverJob = { company: string; title: string; description: string | null };

/**
 * A cover letter for one job. Written by Claude when ANTHROPIC_API_KEY is set; otherwise the
 * person's own note, pointed at this company and role.
 */
export async function coverLetterFor(job: CoverJob, resumeText: string | null, note: string | null): Promise<string | null> {
  const fallback = note ? `${note.trim()}\n\nI'd be glad to bring this to ${job.company} as ${job.title}.` : null;
  if (!process.env.ANTHROPIC_API_KEY || !resumeText) return fallback;
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content:
            `<job company="${job.company}" title="${job.title}">\n${(job.description ?? "").slice(0, 6000)}\n</job>\n\n` +
            `<resume>\n${resumeText.slice(0, 15000)}\n</resume>` +
            (note ? `\n\n<their_note>\n${note}\n</their_note>` : ""),
        },
      ],
    });
    if (response.stop_reason === "refusal") return fallback;
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || fallback;
  } catch (err) {
    console.error("Cover letter failed", err);
    return fallback;
  }
}
