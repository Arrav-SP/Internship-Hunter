import { OPPORTUNITY_COLUMNS } from "@/lib/opportunity";
import { ImportClient } from "./import-client";

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Import opportunities</h1>
      <div className="text-muted-foreground mb-6 grid gap-2 text-sm">
        <p>
          Upload a CSV with a header row. Only <code>organization</code> and <code>title</code> are required; advertised
          postings also need <code>source_url</code> or <code>apply_url</code>. You&apos;ll see a preview before anything is saved.
        </p>
        <p>
          Columns: <code>{OPPORTUNITY_COLUMNS.join(", ")}</code>. Dates are YYYY-MM-DD; skills are comma-separated inside
          one cell.{" "}
          <a className="underline" href="/opportunities/import/template" download>Download a blank template</a>.
        </p>
      </div>
      <ImportClient />
    </main>
  );
}
