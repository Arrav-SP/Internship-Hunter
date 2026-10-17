// CSV import planning: parse, validate and dedupe within the file. No database access here.
import { parseCsv } from "./csv.ts";
import { errorMap } from "./form.ts";
import { dedupeKey, OPPORTUNITY_COLUMNS, opportunitySchema, parseOpportunity, toRow } from "./opportunity.ts";

export const MAX_IMPORT_BYTES = 900_000; // stays under the 1 MB Server Action body limit
export const MAX_IMPORT_ROWS = 2000;

export type PlannedRow = {
  line: number; // line number in the file, counting the header as line 1
  organization: string;
  title: string;
  status: "new" | "duplicate" | "duplicate_in_file" | "invalid";
  errors: string[];
  key?: string;
  row?: ReturnType<typeof toRow> & { source: "csv" };
};

export type ImportPlan = { fileErrors: string[]; unknownColumns: string[]; rows: PlannedRow[] };

export function planImport(text: string): ImportPlan {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
    return { fileErrors: [`File is larger than ${MAX_IMPORT_BYTES / 1000} KB; split it into smaller files.`], unknownColumns: [], rows: [] };
  }
  const parsed = parseCsv(text);
  const fileErrors = [...parsed.errors];
  for (const required of ["organization", "title"]) {
    if (!parsed.fields.includes(required)) fileErrors.push(`Missing required column "${required}".`);
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) fileErrors.push(`More than ${MAX_IMPORT_ROWS} rows; split the file.`);
  if (fileErrors.length) return { fileErrors, unknownColumns: [], rows: [] };

  const known = new Set<string>(OPPORTUNITY_COLUMNS);
  const unknownColumns = parsed.fields.filter((f) => f && !known.has(f));
  const seen = new Set<string>();

  const rows = parsed.rows.map((raw, i): PlannedRow => {
    const line = i + 2;
    const base = { line, organization: (raw.organization ?? "").trim(), title: (raw.title ?? "").trim(), errors: [] as string[] };
    const result = opportunitySchema.safeParse(parseOpportunity((k) => raw[k]));
    if (!result.success) {
      return { ...base, status: "invalid", errors: Object.entries(errorMap(result.error)).map(([k, m]) => `${k}: ${m}`) };
    }
    const row = { ...toRow(result.data), source: "csv" as const };
    const key = dedupeKey(row);
    if (seen.has(key)) return { ...base, status: "duplicate_in_file", key, errors: ["Same listing appears earlier in this file"] };
    seen.add(key);
    return { ...base, status: "new", key, row };
  });
  return { fileErrors, unknownColumns, rows };
}
