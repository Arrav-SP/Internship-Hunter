import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { label } from "@/lib/opportunity";
import type { ContactRow } from "./contact-form";

async function Table() {
  const supabase = await db();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, outreach(count)")
    .order("organization")
    .order("name")
    .returns<(ContactRow & { outreach: { count: number }[] })[]>();
  if (error) throw new Error(`Failed to load contacts: ${error.message}`);
  if (!data.length) {
    return <p className="text-muted-foreground">No contacts yet. Add them from an opportunity&apos;s outreach section or here.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground border-b text-xs">
          <tr>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Organization</th>
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Source</th>
            <th className="py-2 pr-4 font-medium">Outreach</th>
            <th className="py-2 font-medium">Researched</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-b align-top">
              <td className="py-2 pr-4">
                <Link className="font-medium hover:underline" href={`/contacts/${c.id}/edit`}>{c.name}</Link>
                <div className="text-muted-foreground">{[c.role, c.team].filter(Boolean).join(" · ")}</div>
              </td>
              <td className="py-2 pr-4">{c.organization}</td>
              <td className="py-2 pr-4">{c.email ?? "—"} <span className="text-muted-foreground">({label(c.email_status)})</span></td>
              <td className="py-2 pr-4">
                {c.source_url ? <a className="underline" href={c.source_url} target="_blank" rel="noopener noreferrer">source ↗</a> : "—"}
              </td>
              <td className="py-2 pr-4 tabular-nums">{c.outreach[0]?.count ?? 0}</td>
              <td className="py-2">{fmtDate(c.researched_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Link className={buttonVariants()} href="/contacts/new">Add contact</Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Table />
      </Suspense>
    </main>
  );
}
