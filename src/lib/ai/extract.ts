import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractedProfileSchema, mergeProfiles, type ExtractedProfile } from "@/lib/profile";
import { heuristicProfile, isLinkedInExport, type ProfileHints } from "./heuristic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const SYSTEM = `You read resumes for a job search app and suggest what the candidate is looking for next.
The candidate reviews and edits every suggestion, so prefer reasonable, specific suggestions over leaving fields empty.
Use only what the resume supports. Do not invent employers, degrees or skills.
For salary: if the resume states expectations, use them. Otherwise estimate a realistic annual base salary range for the suggested roles, seniority and location, in the local currency, and set isEstimate to true. Use null only when there is no basis for any estimate.
Locations are where the person lives or wants to work, not every place they have worked.
You may get both a resume and the person's LinkedIn profile export. They describe the same person: combine them, and where they disagree prefer the newer details.`;

export type Extraction = { profile: ExtractedProfile; by: "claude" | "heuristic" };

function fallback(documents: string[], hints: ProfileHints): ExtractedProfile {
  return documents.map((d) => heuristicProfile(d, hints)).reduce(mergeProfiles);
}

/**
 * Reads a resume (and the person's LinkedIn profile export, when they gave both; newest first)
 * and suggests preferences. Uses Claude when ANTHROPIC_API_KEY is set, otherwise a
 * keyword-based fallback so the app still works without a key.
 */
export async function extractProfile(documents: string[], hints: ProfileHints = {}): Promise<Extraction> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { profile: fallback(documents, hints), by: "heuristic" };
  }

  const content = documents
    .map((d) => (isLinkedInExport(d) ? `<linkedin_profile>\n${d}\n</linkedin_profile>` : `<resume>\n${d}\n</resume>`))
    .join("\n\n");
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractedProfileSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    // Fall back rather than leave the user with an empty form.
    return { profile: fallback(documents, hints), by: "heuristic" };
  }
  return { profile: response.parsed_output, by: "claude" };
}
