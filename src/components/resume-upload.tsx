"use client";

import { useActionState, useState } from "react";
import { uploadResume } from "@/app/actions/resume";

export function ResumeUpload() {
  const [state, formAction, pending] = useActionState(uploadResume, undefined);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label
        htmlFor="resume"
        onDragOver={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={() => setDragging(false)}
        className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line"
        }`}
      >
        <span className="font-medium">{fileName ?? "Drop your resume here, or click to choose"}</span>
        <span className="text-sm text-muted">PDF or DOCX, up to 5 MB</span>
        {/* The input covers the drop zone so dropped files land on it. */}
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {pending && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
          Reading your resume and working out what you&apos;re looking for. This takes a few seconds.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {state.error}
        </p>
      )}
      <button className="btn self-start" disabled={pending || !fileName}>
        {pending ? "Reading…" : "Continue"}
      </button>
    </form>
  );
}
