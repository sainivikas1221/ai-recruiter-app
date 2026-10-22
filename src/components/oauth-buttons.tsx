import { googleEnabled } from "@/lib/auth/google";
import { linkedinEnabled } from "@/lib/auth/linkedin";

export function OAuthButtons() {
  const google = googleEnabled();
  const linkedin = linkedinEnabled();
  if (!google && !linkedin) return null;
  return (
    <>
      {/* Plain links: the OAuth redirect must be a full page navigation. */}
      {linkedin && (
        <a href="/api/auth/linkedin" className="btn-ghost w-full">
          Continue with LinkedIn
        </a>
      )}
      {google && (
        <a href="/api/auth/google" className="btn-ghost w-full">
          Continue with Google
        </a>
      )}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
