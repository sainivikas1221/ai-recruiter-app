import "server-only";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ResumeParseError extends Error {}

export function resumeKind(file: { name: string; type: string }): "pdf" | "docx" | null {
  const name = file.name.toLowerCase();
  if (file.type === PDF || name.endsWith(".pdf")) return "pdf";
  if (file.type === DOCX || name.endsWith(".docx")) return "docx";
  return null;
}

/** Turns an uploaded PDF or DOCX into plain text. */
export async function extractResumeText(file: File): Promise<string> {
  if (file.size === 0) throw new ResumeParseError("The file is empty.");
  if (file.size > MAX_RESUME_BYTES) throw new ResumeParseError("The file is larger than 5 MB.");

  const kind = resumeKind(file);
  if (!kind) throw new ResumeParseError("Upload a PDF or DOCX file.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    if (kind === "pdf") {
      const { extractText } = await import("unpdf");
      text = (await extractText(bytes, { mergePages: true })).text;
    } else {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    }
  } catch {
    throw new ResumeParseError("We couldn't read that file. Try saving it again as a PDF.");
  }

  text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 100) {
    throw new ResumeParseError(
      "We couldn't find much text in that file. If it is a scanned image, upload a text-based PDF or DOCX.",
    );
  }
  return text;
}
