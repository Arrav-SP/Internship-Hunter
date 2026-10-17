"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_IMPORT_BYTES } from "@/lib/import";
import { commitImport, previewImport, type CommitResult, type Preview } from "./actions";

const STATUS_TEXT = { new: "New", duplicate: "Already saved", duplicate_in_file: "Repeated in file", invalid: "Invalid" } as const;

export function ImportClient() {
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    setPreview(null); setResult(null); setError(null); setText(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setError(`File is larger than ${MAX_IMPORT_BYTES / 1000} KB; split it into smaller files.`);
    const content = await file.text();
    setText(content);
    startTransition(async () => {
      try {
        setPreview(await previewImport(content));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed");
      }
    });
  }

  function onImport() {
    if (!text) return;
    startTransition(async () => {
      try {
        setResult(await commitImport(text));
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid max-w-md gap-1.5">
        <Label htmlFor="file">CSV file</Label>
        <input id="file" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])}
          className="file:bg-secondary text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5" />
      </div>

      <div aria-live="polite" className="grid gap-4">
        {pending && <p className="text-muted-foreground text-sm">Working…</p>}
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}

        {result && (
          <div role="status" className="rounded-md border p-4 text-sm">
            <p className="font-medium">Imported {result.inserted} new opportunit{result.inserted === 1 ? "y" : "ies"}.</p>
            <p className="text-muted-foreground">
              Skipped {result.counts.duplicate} already saved, {result.counts.duplicate_in_file} repeated in the file and {result.counts.invalid} invalid.
            </p>
            {result.failed.map((f) => <p key={f} className="text-destructive">{f}</p>)}
            <Link className="mt-2 inline-block underline" href="/opportunities">View opportunities</Link>
          </div>
        )}

        {preview && preview.fileErrors.length > 0 && (
          <div role="alert" className="border-destructive text-destructive rounded-md border p-3 text-sm">
            {preview.fileErrors.map((e) => <p key={e}>{e}</p>)}
          </div>
        )}

        {preview && !preview.fileErrors.length && (
          <>
            <p className="text-sm">
              <span className="font-medium">{preview.counts.new} new</span> · {preview.counts.duplicate} already saved ·{" "}
              {preview.counts.duplicate_in_file} repeated in file · {preview.counts.invalid} invalid
            </p>
            {preview.unknownColumns.length > 0 && (
              <p className="text-muted-foreground text-sm">Ignored columns: {preview.unknownColumns.join(", ")}</p>
            )}
            <div>
              <Button onClick={onImport} disabled={pending || preview.counts.new === 0}>
                Import {preview.counts.new} new row{preview.counts.new === 1 ? "" : "s"}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground border-b text-xs">
                  <tr><th className="py-2 pr-4 font-medium">Line</th><th className="py-2 pr-4 font-medium">Organization</th><th className="py-2 pr-4 font-medium">Title</th><th className="py-2 pr-4 font-medium">Result</th><th className="py-2 font-medium">Details</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.line} className="border-b align-top">
                      <td className="py-2 pr-4">{r.line}</td>
                      <td className="py-2 pr-4">{r.organization || "—"}</td>
                      <td className="py-2 pr-4">{r.title || "—"}</td>
                      <td className={`py-2 pr-4 ${r.status === "invalid" ? "text-destructive" : ""}`}>{STATUS_TEXT[r.status]}</td>
                      <td className="py-2">
                        {r.existingId ? <Link className="underline" href={`/opportunities/${r.existingId}`}>Open existing</Link> : r.errors.join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
