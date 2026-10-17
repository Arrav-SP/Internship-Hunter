"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { orValue } from "@/lib/filters";
import { errorMap } from "@/lib/form";
import { escapeLike } from "@/lib/opportunity";
import { contactSchema, parseContactForm } from "@/lib/tracking";

export type ContactFormState = { errors: Record<string, string>; message?: string; duplicateId?: string };

async function save(id: string | null, form: FormData): Promise<ContactFormState> {
  const result = contactSchema.safeParse(parseContactForm(form));
  if (!result.success) return { errors: errorMap(result.error) };
  const c = result.data;
  const supabase = await db();

  // Same person = same email, or same name at the same organization (case-insensitive).
  const v = (s: string) => orValue(escapeLike(s));
  let dup = supabase.from("contacts").select("id").limit(1)
    .or(`and(organization.ilike.${v(c.organization)},name.ilike.${v(c.name)})${c.email ? `,email.ilike.${v(c.email)}` : ""}`);
  if (id) dup = dup.neq("id", id);
  const existing = await dup;
  if (existing.error) throw new Error(`Duplicate check failed: ${existing.error.message}`);
  if (existing.data[0]) return { errors: {}, message: "This contact is already saved.", duplicateId: existing.data[0].id };

  const { error } = id
    ? await supabase.from("contacts").update(c).eq("id", id)
    : await supabase.from("contacts").insert(c);
  if (error) {
    if (error.code === "23505") return { errors: {}, message: "This contact is already saved." };
    return { errors: {}, message: `Could not save: ${error.message}` };
  }
  redirect(String(form.get("return_to") ?? "").startsWith("/opportunities/") ? String(form.get("return_to")) : "/contacts");
}

export async function createContact(_prev: ContactFormState, form: FormData) {
  return save(null, form);
}

export async function updateContact(id: string, _prev: ContactFormState, form: FormData) {
  return save(z.uuid().parse(id), form);
}

export async function deleteContact(id: string): Promise<{ message?: string }> {
  const supabase = await db();
  const { error } = await supabase.from("contacts").delete().eq("id", z.uuid().parse(id));
  if (error?.code === "23503") return { message: "This contact has outreach records; delete or reassign those first." };
  if (error) return { message: `Could not delete: ${error.message}` };
  redirect("/contacts");
}
