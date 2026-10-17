import { googleEnabled } from "@/lib/auth/google";

export function GoogleButton() {
  if (!googleEnabled()) return null;
  return (
    <>
      {/* A plain link: the OAuth redirect must be a full page navigation. */}
      <a href="/api/auth/google" className="btn-ghost w-full">
        Continue with Google
      </a>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
