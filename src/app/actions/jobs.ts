"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { getPreferences } from "@/lib/preferences";
import { refreshFeeds } from "@/lib/jobs/search";

export async function refreshJobs() {
  const user = await requireUser();
  const prefs = await getPreferences(user.id);
  if (!prefs) redirect("/onboarding");
  await refreshFeeds(prefs, true);
  redirect("/jobs");
}
