"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { CREDIT_PACKS, addPurchasedCredits } from "@/lib/credits";

/** Test purchase: no payment yet, the credits are added straight away. */
export async function buyCredits(formData: FormData) {
  const user = await requireUser();
  const credits = Number(formData.get("credits"));
  if (!CREDIT_PACKS.includes(credits as (typeof CREDIT_PACKS)[number])) return;
  await addPurchasedCredits(user.id, credits);
  revalidatePath("/", "layout");
  redirect(`/credits?bought=${credits}`);
}
