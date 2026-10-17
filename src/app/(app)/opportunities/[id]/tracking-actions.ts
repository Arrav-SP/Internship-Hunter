"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorMap, str } from "@/lib/form";
import { todayIST } from "@/lib/format";
import {
  applicationSchema, logSchema, outreachSchema, parseApplicationForm, parseOutreachForm, recentSend, RESEND_WINDOW_DAYS, statusTimestamps,
} from "@/lib/tracking";

export type TrackState = { errors: Record<string, string>; saved?: boolean; message?: string; needsConfirm?: boolean };
const uuid = (v: string) => z.uuid().parse(v);
const fail = (message: string): TrackState => ({ errors: {}, message });

export async function updateApplication(opportunityId: string, _prev: TrackState, form: FormData): Promise<TrackState> {
  const result = applicationSchema.safeParse(parseApplicationForm(form));
  if (!result.success) return { errors: errorMap(result.error) };
  const supabase = await db();
  const current = await supabase.from("applications").select("id, status, applied_at").eq("opportunity_id", uuid(opportunityId)).single();
  if (current.error) return fail(`Could not load application: ${current.error.message}`);

  const next = { ...result.data };
  if (next.status === "applied" && !next.applied_at) next.applied_at = todayIST();
  const { error } = await supabase.from("applications").update(next).eq("id", current.data.id);
  if (error) return fail(`Could not save: ${error.message}`);
  if (current.data.status !== next.status) {
    await supabase.from("events").insert({
      opportunity_id: opportunityId, application_id: current.data.id, kind: "status_change",
      detail: { target: "application", from: current.data.status, to: next.status },
    });
  }
  refresh();
  return { errors: {}, saved: true };
}

export async function logEvent(opportunityId: string, _prev: TrackState, form: FormData): Promise<TrackState> {
  const result = logSchema.safeParse({ kind: str(form.get("kind")), text: str(form.get("text")), occurred_on: str(form.get("occurred_on")) || null });
  if (!result.success) return { errors: errorMap(result.error) };
  const { kind, text, occurred_on } = result.data;
  const supabase = await db();
  const { error } = await supabase.from("events").insert({
    opportunity_id: uuid(opportunityId), kind, detail: { text },
    // A date-only entry is placed at noon IST so it sorts on the right day.
    occurred_at: occurred_on ? `${occurred_on}T12:00:00+05:30` : new Date().toISOString(),
  });
  if (error) return fail(`Could not save: ${error.message}`);
  refresh();
  return { errors: {}, saved: true };
}

type OutreachRow = { id: string; status: string; contact_id: string | null; sent_at: string | null; replied_at: string | null };

/** Insert or update outreach, enforcing the duplicate-email guard when it becomes "sent". */
async function saveOutreach(opportunityId: string, existing: OutreachRow | null, form: FormData): Promise<TrackState> {
  const result = outreachSchema.safeParse(parseOutreachForm(form));
  if (!result.success) return { errors: errorMap(result.error) };
  const o = result.data;
  const supabase = await db();

  const becomesSent = ["sent", "replied", "follow_up_due"].includes(o.status) && !existing?.sent_at;
  if (becomesSent && o.contact_id && form.get("confirm_resend") !== "on") {
    const others = await supabase.from("outreach").select("id, sent_at, opportunities(organization, title)").eq("contact_id", o.contact_id).not("sent_at", "is", null);
    if (others.error) return fail(`Could not check earlier emails: ${others.error.message}`);
    const clash = recentSend(others.data, existing?.id ?? "");
    if (clash) {
      return {
        errors: {}, needsConfirm: true,
        message: `You already emailed this contact in the last ${RESEND_WINDOW_DAYS} days. Tick "Send anyway" if this is intentional.`,
      };
    }
  }

  const row = { ...o, ...statusTimestamps(o.status, existing ?? { sent_at: null, replied_at: null }), opportunity_id: uuid(opportunityId) };
  const saved = existing
    ? await supabase.from("outreach").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("outreach").insert(row).select("id").single();
  if (saved.error) {
    if (saved.error.code === "23505") {
      return fail(o.contact_id ? "There is already outreach to this contact for this opportunity." : "There is already a 'contact needed' entry for this opportunity.");
    }
    return fail(`Could not save: ${saved.error.message}`);
  }
  if (existing?.status !== o.status) {
    await supabase.from("events").insert({
      opportunity_id: opportunityId, outreach_id: saved.data.id, kind: "status_change",
      detail: { target: "outreach", from: existing?.status ?? null, to: o.status },
    });
  }
  refresh();
  return { errors: {}, saved: true };
}

export async function addOutreach(opportunityId: string, _prev: TrackState, form: FormData) {
  return saveOutreach(opportunityId, null, form);
}

export async function updateOutreach(opportunityId: string, outreachId: string, _prev: TrackState, form: FormData) {
  const supabase = await db();
  const { data, error } = await supabase
    .from("outreach").select("id, status, contact_id, sent_at, replied_at").eq("id", uuid(outreachId)).eq("opportunity_id", uuid(opportunityId)).single();
  if (error) return fail(`Could not load outreach: ${error.message}`);
  return saveOutreach(opportunityId, data, form);
}
