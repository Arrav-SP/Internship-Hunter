// Opportunity validation shared by the manual form, CSV import and (later) discovery importers.
import { z } from "zod";
import { canonicalUrl } from "./canonical-url.ts";
import { httpUrl, list, optionalText, orNull, splitList, str } from "./form.ts";

export const KINDS = ["posting", "speculative"] as const;
export const ROLE_CATEGORIES = ["swe", "ml", "data", "research", "other"] as const;
export const OPP_WORK_MODES = ["onsite", "hybrid", "remote", "unknown"] as const;
export const DEADLINE_STATUSES = ["stated", "none_stated", "unknown"] as const;
export const LISTING_STATUSES = ["open", "closed", "expired", "unknown"] as const;
export const ELIGIBILITIES = ["eligible", "potentially_eligible", "ineligible", "unknown"] as const;

export const LABELS: Record<string, string> = {
  posting: "Advertised posting",
  speculative: "Speculative target",
  swe: "SWE / Backend",
  ml: "ML / AI",
  data: "Data",
  research: "Research",
  other: "Other",
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
  unknown: "Unknown",
  stated: "Stated",
  none_stated: "None stated / rolling",
  open: "Open",
  closed: "Closed",
  expired: "Expired",
  eligible: "Eligible",
  potentially_eligible: "Potentially eligible",
  ineligible: "Ineligible",
  // application statuses
  discovered: "Discovered",
  to_review: "To review",
  ready_to_apply: "Ready to apply",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  // event kinds
  discovery: "Added",
  status_change: "Status changed",
  note: "Note",
  response: "Response",
  // contacts and outreach
  verified: "Verified",
  unverified: "Unverified",
  not_found: "Not found",
  recruiter: "Recruiter / program",
  eng_manager: "Engineering manager / lead",
  founder: "Founder / CTO",
  professor: "Professor / supervisor",
  contact_needed: "Contact needed",
  researching_contact: "Researching contact",
  draft_ready: "Draft ready",
  awaiting_approval: "Awaiting approval",
  sent: "Sent",
  replied: "Replied",
  follow_up_due: "Follow-up due",
};
export const label = (v: string | null | undefined) => (v ? (LABELS[v] ?? v) : "—");

const date = z.iso.date().nullable();

export const opportunitySchema = z
  .object({
    kind: z.enum(KINDS),
    organization: z.string().trim().min(1, "Organization is required"),
    title: z.string().trim().min(1, "Title is required"),
    description: optionalText,
    role_category: z.enum(ROLE_CATEGORIES),
    location: optionalText,
    work_mode: z.enum(OPP_WORK_MODES),
    start_date: date,
    end_date: date,
    duration_text: optionalText,
    eligibility_text: optionalText,
    required_skills: list,
    preferred_skills: list,
    compensation_text: optionalText,
    deadline: date,
    deadline_status: z.enum(DEADLINE_STATUSES),
    listing_status: z.enum(LISTING_STATUSES),
    apply_url: httpUrl.nullable(),
    source_url: httpUrl.nullable(),
    posted_at: date,
    eligibility: z.enum(ELIGIBILITIES),
    eligibility_reason: optionalText,
    notes: optionalText,
  })
  .refine((o) => o.kind === "speculative" || o.apply_url || o.source_url, {
    message: "An advertised posting needs its listing or application URL",
    path: ["source_url"],
  })
  .refine((o) => !o.start_date || !o.end_date || o.end_date >= o.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  })
  // A real date always means "stated"; "stated" without a date falls back to unknown.
  .transform((o) => ({
    ...o,
    deadline_status: o.deadline ? ("stated" as const) : o.deadline_status === "stated" ? ("unknown" as const) : o.deadline_status,
  }));

export type OpportunityInput = z.infer<typeof opportunitySchema>;

/** An opportunities row as read from the database. */
export type OpportunityRow = Omit<OpportunityInput, "posted_at"> & {
  id: string;
  source: string;
  source_id: string | null;
  canonical_url: string | null;
  posted_at: string | null; // timestamptz
  discovered_at: string;
  last_verified_at: string | null;
  eligibility_override: boolean;
  fit_score: number | null;
  fit_details: unknown;
  created_at: string;
  updated_at: string;
};

/** Dedupe key: the specific listing page first, since apply URLs are often shared portals. */
export const dedupeUrl = (o: Pick<OpportunityInput, "source_url" | "apply_url">) =>
  canonicalUrl(o.source_url ?? o.apply_url);

/** Columns to write for a validated opportunity. */
export function toRow(o: OpportunityInput) {
  return {
    ...o,
    canonical_url: dedupeUrl(o),
    // A manual eligibility call must not be overwritten by automatic scoring later.
    eligibility_override: o.eligibility !== "unknown",
  };
}

/** Columns accepted by CSV import (same names as the form fields). */
export const OPPORTUNITY_COLUMNS = [
  "kind", "organization", "title", "role_category", "location", "work_mode", "start_date", "end_date",
  "duration_text", "eligibility_text", "required_skills", "preferred_skills", "compensation_text", "deadline",
  "deadline_status", "listing_status", "apply_url", "source_url", "posted_at", "eligibility", "eligibility_reason",
  "description", "notes",
] as const;

/** Build the shape opportunitySchema validates from any key -> value source (form or CSV row). */
export function parseOpportunity(get: (key: string) => unknown): unknown {
  const s = (k: string) => str(get(k) as FormDataEntryValue | null | undefined);
  const text = (k: string) => orNull(s(k));
  // Enum codes are matched leniently ("Potentially eligible" -> potentially_eligible) for hand-made CSVs.
  const code = (k: string, fallback: string) => s(k).toLowerCase().replace(/[\s-]+/g, "_") || fallback;
  return {
    kind: code("kind", "posting"),
    organization: s("organization"),
    title: s("title"),
    description: text("description"),
    role_category: code("role_category", "other"),
    location: text("location"),
    work_mode: code("work_mode", "unknown"),
    start_date: text("start_date"),
    end_date: text("end_date"),
    duration_text: text("duration_text"),
    eligibility_text: text("eligibility_text"),
    required_skills: splitList(s("required_skills")),
    preferred_skills: splitList(s("preferred_skills")),
    compensation_text: text("compensation_text"),
    deadline: text("deadline"),
    deadline_status: code("deadline_status", "unknown"),
    listing_status: code("listing_status", "unknown"),
    apply_url: text("apply_url"),
    source_url: text("source_url"),
    posted_at: text("posted_at"),
    eligibility: code("eligibility", "unknown"),
    eligibility_reason: text("eligibility_reason"),
    notes: text("notes"),
  };
}

export const parseOpportunityForm = (form: FormData) => parseOpportunity((k) => form.get(k));

/** Same key the database enforces: canonical URL, else kind + organization + title (case-insensitive). */
export function dedupeKey(row: { canonical_url: string | null; kind: string; organization: string; title: string }) {
  return row.canonical_url ?? `${row.kind}|${row.organization.toLowerCase()}|${row.title.toLowerCase()}`;
}

/** Escape LIKE wildcards so user text matches literally in ilike filters. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
