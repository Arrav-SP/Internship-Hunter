import "server-only";
import type { db } from "./db";
import { dedupeKey, escapeLike } from "./opportunity";

type Db = Awaited<ReturnType<typeof db>>;
type Keyed = { canonical_url: string | null; kind: string; organization: string; title: string };

/** Existing record with the same dedupe key as `row`, ignoring `excludeId` (the record being edited). */
export async function findDuplicate(supabase: Db, row: Keyed, excludeId?: string): Promise<string | undefined> {
  let q = supabase.from("opportunities").select("id").limit(1);
  q = row.canonical_url
    ? q.eq("canonical_url", row.canonical_url)
    : q.is("canonical_url", null).eq("kind", row.kind)
        .ilike("organization", escapeLike(row.organization))
        .ilike("title", escapeLike(row.title));
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`Duplicate check failed: ${error.message}`);
  return data[0]?.id;
}

/** Map of dedupe key -> existing id for every row that is already saved. */
export async function findExisting(supabase: Db, rows: Keyed[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const urls = rows.flatMap((r) => (r.canonical_url ? [r.canonical_url] : []));
  for (let i = 0; i < urls.length; i += 50) { // chunked: URLs go in the query string
    const { data, error } = await supabase.from("opportunities").select("id, canonical_url").in("canonical_url", urls.slice(i, i + 50));
    if (error) throw new Error(`Duplicate check failed: ${error.message}`);
    for (const d of data) found.set(d.canonical_url, d.id);
  }
  for (const r of rows.filter((r) => !r.canonical_url)) {
    const id = await findDuplicate(supabase, r);
    if (id) found.set(dedupeKey(r), id);
  }
  return found;
}
