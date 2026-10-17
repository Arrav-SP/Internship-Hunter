import Papa from "papaparse";

// Cells starting with these are run as formulas by Excel/Sheets. Imported listings are untrusted,
// so exports neutralise them with a leading apostrophe (OWASP CSV injection guidance).
const FORMULA = /^[=+\-@\t\r]/;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return FORMULA.test(s) ? `'${s}` : s;
}

/** CSV with a UTF-8 BOM so Excel reads non-ASCII text correctly. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return "﻿" + Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => cell(r[c]))) }, { newline: "\r\n" });
}

export type ParsedCsv = { fields: string[]; rows: Record<string, string>[]; errors: string[] };

/** Parse a CSV with a header row. Header names are trimmed and lower-cased. */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
    // Undo the export's formula guard so a re-imported export round-trips.
    transform: (v) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v),
  });
  return {
    fields: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.map((e) => (e.row !== undefined ? `Row ${e.row + 2}: ${e.message}` : e.message)),
  };
}
