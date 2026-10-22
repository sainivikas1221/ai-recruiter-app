"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { canEditSearchKeys, saveSearchKeys, SEARCH_KEYS, type SearchKeyName } from "@/lib/search-keys";

export type KeysState = { error?: string } | undefined;

export async function saveKeys(_prev: KeysState, form: FormData): Promise<KeysState> {
  await requireUser();
  if (!canEditSearchKeys()) return { error: "Keys can only be added on your own computer." };
  const values: Partial<Record<SearchKeyName, string>> = {};
  for (const { name, label } of SEARCH_KEYS) {
    const value = String(form.get(name) ?? "").trim();
    if (!value) continue; // Left blank: keep the saved key.
    if (!/^[A-Za-z0-9_\-]{4,200}$/.test(value)) {
      return { error: `${label} doesn't look right. Copy it again, without spaces.` };
    }
    values[name] = value;
  }
  if (!Object.keys(values).length) return { error: "Paste at least one key." };
  saveSearchKeys(values);
  redirect("/settings/keys?saved=1");
}
