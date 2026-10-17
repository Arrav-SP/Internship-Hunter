import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import type { OpportunityRow } from "@/lib/opportunity";

export type Application = { id: string; updated_at: string; status: string; applied_at: string | null; next_action: string | null; next_action_due: string | null; notes: string | null };
export type Event = { id: string; kind: string; detail: Record<string, unknown>; occurred_at: string; outreach_id: string | null };
export type OutreachContact = { id: string; name: string; role: string | null; email: string | null; email_status: string; profile_url: string | null };
export type Outreach = {
  id: string; updated_at: string; contact_id: string | null; style: string; status: string; subject: string | null; body: string | null;
  sent_at: string | null; replied_at: string | null; follow_up_due: string | null; notes: string | null; contacts: OutreachContact | null;
};
export type OpportunityDetail = OpportunityRow & { applications: Application | null; events: Event[]; outreach: Outreach[] };

/** All contacts, for the outreach contact picker. */
export async function loadContactOptions() {
  const supabase = await db();
  const { data, error } = await supabase.from("contacts").select("id, name, organization, email, email_status").order("organization").order("name");
  if (error) throw new Error(`Failed to load contacts: ${error.message}`);
  return data;
}

/** Load one opportunity with its application and timeline, or 404. */
export async function loadOpportunity(id: string): Promise<OpportunityDetail> {
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await db();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, applications(*), events(id, kind, detail, occurred_at, outreach_id), outreach(*, contacts(id, name, role, email, email_status, profile_url))")
    .eq("id", id)
    .order("occurred_at", { referencedTable: "events", ascending: false })
    .order("created_at", { referencedTable: "outreach" })
    .maybeSingle();
  if (error) throw new Error(`Failed to load opportunity: ${error.message}`);
  if (!data) notFound();
  return data as OpportunityDetail;
}
