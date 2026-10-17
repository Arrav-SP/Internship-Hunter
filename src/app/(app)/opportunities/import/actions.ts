"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { planImport, type PlannedRow } from "@/lib/import";
import { findExisting } from "@/lib/opportunity-db";

export type PreviewRow = Omit<PlannedRow, "row" | "key"> & { existingId?: string };
export type Counts = Record<PlannedRow["status"], number>;
export type Preview = { fileErrors: string[]; unknownColumns: string[]; rows: PreviewRow[]; counts: Counts };
export type CommitResult = { counts: Counts; inserted: number; failed: string[] };

const countRows = (rows: { status: PlannedRow["status"] }[]): Counts => {
  const c: Counts = { new: 0, duplicate: 0, duplicate_in_file: 0, invalid: 0 };
  for (const r of rows) c[r.status]++;
  return c;
};

/** Plan the import and mark rows that already exist in the database. */
async function plan(text: unknown) {
  const plan = planImport(z.string().parse(text));
  const supabase = await db();
  const existing = plan.fileErrors.length
    ? new Map<string, string>()
    : await findExisting(supabase, plan.rows.flatMap((r) => (r.row ? [r.row] : [])));
  const rows = plan.rows.map((r) => {
    const id = r.status === "new" ? existing.get(r.key!) : undefined;
    return id ? { ...r, status: "duplicate" as const, existingId: id, errors: ["Already saved"] } : r;
  });
  return { plan: { ...plan, rows }, supabase };
}

export async function previewImport(text: string): Promise<Preview> {
  const { plan: p } = await plan(text);
  return {
    fileErrors: p.fileErrors,
    unknownColumns: p.unknownColumns,
    rows: p.rows.map((r) => ({
      line: r.line, organization: r.organization, title: r.title, status: r.status, errors: r.errors,
      existingId: "existingId" in r ? r.existingId : undefined,
    })),
    counts: countRows(p.rows),
  };
}

export async function commitImport(text: string): Promise<CommitResult> {
  const { plan: p, supabase } = await plan(text);
  const fresh = p.rows.filter((r) => r.status === "new");
  const counts = countRows(p.rows);
  if (p.fileErrors.length || !fresh.length) return { counts, inserted: 0, failed: p.fileErrors };

  // One bulk insert; if something was added meanwhile, fall back to row by row so the rest still land.
  const bulk = await supabase.from("opportunities").insert(fresh.map((r) => r.row!));
  if (!bulk.error) return { counts, inserted: fresh.length, failed: [] };

  let inserted = 0;
  const failed: string[] = [];
  for (const r of fresh) {
    const { error } = await supabase.from("opportunities").insert(r.row!);
    if (!error) inserted++;
    else if (error.code === "23505") { counts.new--; counts.duplicate++; }
    else failed.push(`Line ${r.line}: ${error.message}`);
  }
  return { counts, inserted, failed };
}
