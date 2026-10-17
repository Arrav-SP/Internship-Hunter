"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { errorMap, parseProfileForm, profileSchema } from "@/lib/profile";

export type SaveState = { errors: Record<string, string>; saved: boolean; message?: string };

export async function saveProfile(_prev: SaveState, form: FormData): Promise<SaveState> {
  const result = profileSchema.safeParse(parseProfileForm(form));
  if (!result.success) return { errors: errorMap(result.error), saved: false };

  const supabase = await db();
  const { error } = await supabase.from("profile").upsert({ id: true, ...result.data });
  if (error) return { errors: {}, saved: false, message: `Could not save: ${error.message}` };

  refresh();
  return { errors: {}, saved: true };
}
