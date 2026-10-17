// Opportunity list filters, read from URL search params. Invalid values fall back to "no filter".
import { z } from "zod";
import { ELIGIBILITIES, KINDS, LISTING_STATUSES, ROLE_CATEGORIES } from "./opportunity.ts";

export const APPLICATION_STATUSES = [
  "discovered", "to_review", "ready_to_apply", "applied", "assessment", "interview", "offer", "rejected", "withdrawn",
] as const;
export const DEADLINE_FILTERS = ["14d", "30d", "passed", "none_stated", "unknown"] as const;
export const SORTS = ["discovered", "deadline", "fit", "organization"] as const;

const opt = <T extends z.ZodType>(s: T) => s.optional().catch(undefined);

const filterSchema = z.object({
  q: opt(z.string().trim().min(1).max(100)),
  kind: opt(z.enum(KINDS)),
  role: opt(z.enum(ROLE_CATEGORIES)),
  eligibility: opt(z.enum(ELIGIBILITIES)),
  status: opt(z.enum(APPLICATION_STATUSES)),
  listing: opt(z.enum(LISTING_STATUSES)),
  location: opt(z.string().trim().min(1).max(100)),
  comp: opt(z.enum(["stated", "not_stated"])),
  deadline: opt(z.enum(DEADLINE_FILTERS)),
  min_fit: opt(z.coerce.number().int().min(0).max(100)),
  sort: z.enum(SORTS).catch("discovered"),
});

export type Filters = z.infer<typeof filterSchema>;

export function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const first = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined]));
  return filterSchema.parse(first);
}

/** Wrap a value for a PostgREST or=(...) filter, where commas, dots and parens are syntax. */
export const orValue = (s: string) => `"${s.replace(/["\\]/g, (c) => `\\${c}`)}"`;

/** Count of filters in use (excluding sort), for the "clear filters" UI. */
export const activeFilterCount = (f: Filters) => Object.entries(f).filter(([k, v]) => k !== "sort" && v !== undefined).length;
