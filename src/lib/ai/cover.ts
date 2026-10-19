import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { templateCoverLetter, type CoverJob, type CoverProfile } from "@/lib/apply/cover-template";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const SYSTEM = `You write cover letters that job seekers send with an application.
Write in the person's own voice, first person, plain text, 150 to 220 words.
Start with "Dear <company> hiring team," and end with "Best regards," and the person's name on the next line.
Use only facts from the resume. Never invent employers, numbers, degrees or skills.
Connect two or three of their strongest experiences to what this job description asks for.`;

/**
 * A cover letter for one job, from the person's resume and the job description. Written by
 * Claude when ANTHROPIC_API_KEY is set, otherwise built from a template; never empty.
 */
export async function coverLetterFor(job: CoverJob, profile: CoverProfile, resumeText: string | null): Promise<string> {
  const fallback = templateCoverLetter(profile, job);
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
            `<resume name="${profile.name}">\n${resumeText.slice(0, 15000)}\n</resume>`,
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
