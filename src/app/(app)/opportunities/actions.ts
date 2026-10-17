"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorMap } from "@/lib/form";
import { opportunitySchema, parseOpportunityForm, toRow } from "@/lib/opportunity";
import { findDuplicate } from "@/lib/opportunity-db";

export type OppFormState = { errors: Record<string, string>; message?: string; duplicateId?: string };

type Row = ReturnType<typeof toRow>;

const duplicate = (duplicateId: string): OppFormState => ({
  errors: {},
  message: "This opportunity is already saved.",
  duplicateId,
});

async function save(id: string | null, form: FormData): Promise<OppFormState> {
  const result = opportunitySchema.safeParse(parseOpportunityForm(form));
  if (!result.success) return { errors: errorMap(result.error) };

  const row: Row & { last_verified_at?: string } = toRow(result.data);
  if (form.get("verified") === "on") row.last_verified_at = new Date().toISOString();

  const supabase = await db();
  const existing = await findDuplicate(supabase, row, id ?? undefined);
  if (existing) return duplicate(existing);

  const { data, error } = id
    ? await supabase.from("opportunities").update(row).eq("id", id).select("id").single()
    : await supabase.from("opportunities").insert(row).select("id").single();
  if (error) {
    // Lost a race with another insert: the unique constraints caught it.
    const raced = error.code === "23505" && (await findDuplicate(supabase, row, id ?? undefined));
    if (raced) return duplicate(raced);
    return { errors: {}, message: `Could not save: ${error.message}` };
  }
  redirect(`/opportunities/${data.id}`);
}

export async function createOpportunity(_prev: OppFormState, form: FormData) {
  return save(null, form);
}

export async function updateOpportunity(id: string, _prev: OppFormState, form: FormData) {
  return save(z.uuid().parse(id), form);
}

export async function deleteOpportunity(id: string) {
  const supabase = await db();
  const { error } = await supabase.from("opportunities").delete().eq("id", z.uuid().parse(id));
  if (error) throw new Error(`Could not delete: ${error.message}`);
  redirect("/opportunities");
}
