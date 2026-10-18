"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page every few seconds while JobPilot is still working. */
export function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
