// Validation and rules for application tracking, contacts and outreach.
import { z } from "zod";
import { httpUrl, optionalText, orNull, str } from "./form.ts";
import { APPLICATION_STATUSES } from "./filters.ts";

export const EMAIL_STATUSES = ["verified", "unverified", "not_found"] as const;
export const OUTREACH_STYLES = ["recruiter", "eng_manager", "founder", "professor"] as const;
export const OUTREACH_STATUSES = [
  "contact_needed", "researching_contact", "draft_ready", "awaiting_approval", "sent", "replied", "follow_up_due", "closed",
] as const;
export const LOG_KINDS = ["note", "interview", "response"] as const;
export const IN_PROGRESS = ["applied", "assessment", "interview"] as const;
export const RESEND_WINDOW_DAYS = 30;

const date = z.iso.date().nullable();
const get = (form: FormData, k: string) => orNull(str(form.get(k)));

export const applicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  applied_at: date,
  next_action: optionalText,
  next_action_due: date,
  notes: optionalText,
});

export const parseApplicationForm = (form: FormData) => ({
  status: str(form.get("status")),
  applied_at: get(form, "applied_at"),
  next_action: get(form, "next_action"),
  next_action_due: get(form, "next_action_due"),
  notes: get(form, "notes"),
});

export const logSchema = z.object({
  kind: z.enum(LOG_KINDS),
  text: z.string().trim().min(1, "Write what happened").max(5000),
  occurred_on: date,
});

export const contactSchema = z
  .object({
    organization: z.string().trim().min(1, "Organization is required"),
    name: z.string().trim().min(1, "Name is required"),
    role: optionalText,
    team: optionalText,
    email: z.email().nullable(),
    email_status: z.enum(EMAIL_STATUSES),
    profile_url: httpUrl.nullable(),
    source_url: httpUrl.nullable(),
    researched_at: date,
    relevance: optionalText,
    notes: optionalText,
  })
  .refine((c) => c.email || c.email_status === "not_found", {
    message: "Without an email the status must be 'Not found'",
    path: ["email_status"],
  })
  .refine((c) => !c.email || c.email_status !== "not_found", {
    message: "An email was entered, so choose Verified or Unverified",
    path: ["email_status"],
  });

export const parseContactForm = (form: FormData) => ({
  organization: str(form.get("organization")),
  name: str(form.get("name")),
  role: get(form, "role"),
  team: get(form, "team"),
  email: get(form, "email"),
  email_status: str(form.get("email_status")) || (get(form, "email") ? "unverified" : "not_found"),
  profile_url: get(form, "profile_url"),
  source_url: get(form, "source_url"),
  researched_at: get(form, "researched_at"),
  relevance: get(form, "relevance"),
  notes: get(form, "notes"),
});

export const outreachSchema = z
  .object({
    contact_id: z.uuid().nullable(),
    style: z.enum(OUTREACH_STYLES),
    status: z.enum(OUTREACH_STATUSES),
    subject: optionalText,
    body: optionalText,
    follow_up_due: date,
    notes: optionalText,
  })
  .refine((o) => o.contact_id || ["contact_needed", "researching_contact"].includes(o.status), {
    message: "Pick a contact before moving past research",
    path: ["status"],
  });

export const parseOutreachForm = (form: FormData) => ({
  contact_id: get(form, "contact_id"),
  style: str(form.get("style")),
  status: str(form.get("status")) || (get(form, "contact_id") ? "draft_ready" : "contact_needed"),
  subject: get(form, "subject"),
  body: get(form, "body"),
  follow_up_due: get(form, "follow_up_due"),
  notes: get(form, "notes"),
});

/**
 * Duplicate-email guard: another outreach to the same contact marked sent within the window.
 * Returns the conflicting send, if any.
 */
export function recentSend<T extends { id: string; sent_at: string | null }>(
  otherSends: T[], selfId: string, now = new Date(), days = RESEND_WINDOW_DAYS,
): T | undefined {
  const cutoff = now.getTime() - days * 86_400_000;
  return otherSends.find((s) => s.id !== selfId && s.sent_at && Date.parse(s.sent_at) >= cutoff);
}

/** Timestamps implied by a status change, never overwriting ones already recorded. */
export function statusTimestamps(status: string, current: { sent_at: string | null; replied_at: string | null }, now = new Date()) {
  const iso = now.toISOString();
  return {
    sent_at: current.sent_at ?? (status === "sent" || status === "replied" || status === "follow_up_due" ? iso : null),
    replied_at: current.replied_at ?? (status === "replied" ? iso : null),
  };
}
