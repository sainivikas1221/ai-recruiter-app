import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractedProfileSchema, type ExtractedProfile } from "@/lib/profile";
import { heuristicProfile } from "./heuristic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const SYSTEM = `You read resumes for a job search app and suggest what the candidate is looking for next.
The candidate reviews and edits every suggestion, so prefer reasonable, specific suggestions over leaving fields empty.
Use only what the resume supports. Do not invent employers, degrees or skills.
For salary: if the resume states expectations, use them. Otherwise estimate a realistic annual base salary range for the suggested roles, seniority and location, in the local currency, and set isEstimate to true. Use null only when there is no basis for any estimate.
Locations are where the person lives or wants to work, not every place they have worked.`;

export type Extraction = { profile: ExtractedProfile; by: "claude" | "heuristic" };

/**
 * Reads a resume and suggests preferences. Uses Claude when ANTHROPIC_API_KEY is set,
 * otherwise a keyword-based fallback so the app still works in local development.
 */
export async function extractProfile(resumeText: string): Promise<Extraction> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { profile: heuristicProfile(resumeText), by: "heuristic" };
  }

  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractedProfileSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `<resume>\n${resumeText}\n</resume>` }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    // Fall back rather than leave the user with an empty form.
    return { profile: heuristicProfile(resumeText), by: "heuristic" };
  }
  return { profile: response.parsed_output, by: "claude" };
}
