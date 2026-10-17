import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import {
  activeFilterCount, APPLICATION_STATUSES, DEADLINE_FILTERS, orValue, parseFilters, SORTS, type Filters,
} from "@/lib/filters";
import { addDays, deadlineText, fmtDate, todayIST } from "@/lib/format";
import { ELIGIBILITIES, escapeLike, KINDS, label, LISTING_STATUSES, ROLE_CATEGORIES, type OpportunityRow } from "@/lib/opportunity";

const LIMIT = 500;

type ListRow = Pick<
  OpportunityRow,
  "id" | "kind" | "organization" | "title" | "role_category" | "location" | "work_mode" | "deadline" | "deadline_status" | "eligibility" | "fit_score" | "discovered_at"
> & { applications: { status: string } | null };

const FILTER_LABELS: Record<string, string> = {
  "14d": "Due in 14 days", "30d": "Due in 30 days", passed: "Passed", none_stated: "None stated", unknown: "Unknown",
  stated: "Stated", not_stated: "Not stated", discovered: "Newest", deadline: "Deadline", fit: "Fit score", organization: "Company",
};
const filterLabel = (v: string) => FILTER_LABELS[v] ?? label(v);

async function load(f: Filters) {
  const supabase = await db();
  // !inner turns the embedded application into a join, so filtering on its status filters opportunities.
  let q = supabase
    .from("opportunities")
    .select(
      `id, kind, organization, title, role_category, location, work_mode, deadline, deadline_status, eligibility, fit_score, discovered_at, applications${f.status ? "!inner" : ""}(status)`,
    );
  if (f.q) {
    const pattern = orValue(`*${escapeLike(f.q)}*`);
    q = q.or(["organization", "title", "location", "description"].map((c) => `${c}.ilike.${pattern}`).join(","));
  }
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.role) q = q.eq("role_category", f.role);
  if (f.eligibility) q = q.eq("eligibility", f.eligibility);
  if (f.listing) q = q.eq("listing_status", f.listing);
  if (f.status) q = q.eq("applications.status", f.status);
  if (f.location) q = q.ilike("location", `%${escapeLike(f.location)}%`);
  if (f.comp === "stated") q = q.not("compensation_text", "is", null);
  if (f.comp === "not_stated") q = q.is("compensation_text", null);
  if (f.min_fit !== undefined) q = q.gte("fit_score", f.min_fit);
  const today = todayIST();
  if (f.deadline === "14d" || f.deadline === "30d") {
    q = q.gte("deadline", today).lte("deadline", addDays(today, f.deadline === "14d" ? 14 : 30));
  }
  if (f.deadline === "passed") q = q.lt("deadline", today);
  if (f.deadline === "none_stated" || f.deadline === "unknown") q = q.eq("deadline_status", f.deadline);

  q = {
    discovered: () => q.order("discovered_at", { ascending: false }),
    deadline: () => q.order("deadline", { ascending: true, nullsFirst: false }),
    fit: () => q.order("fit_score", { ascending: false, nullsFirst: false }),
    organization: () => q.order("organization").order("title"),
  }[f.sort]();

  const { data, error } = await q.limit(LIMIT).returns<ListRow[]>();
  if (error) throw new Error(`Failed to load opportunities: ${error.message}`);
  return data;
}

function Select({ name, label: text, value, options }: { name: string; label: string; value?: string; options: readonly string[] }) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={name} className="text-xs">{text}</Label>
      <select id={name} name={name} defaultValue={value ?? ""} className="border-input bg-background h-8 rounded-md border px-2 text-sm">
        {name !== "sort" && <option value="">Any</option>}
        {options.map((o) => <option key={o} value={o}>{filterLabel(o)}</option>)}
      </select>
    </div>
  );
}

function FilterForm({ f }: { f: Filters }) {
  return (
    // GET form: filters live in the URL, so views can be bookmarked and work without JavaScript.
    <Form action="/opportunities" className="mb-6 grid grid-cols-2 items-end gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <div className="col-span-2 grid gap-1">
        <Label htmlFor="q" className="text-xs">Search</Label>
        <Input id="q" name="q" defaultValue={f.q} placeholder="Company, title, location, description" className="h-8" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="location" className="text-xs">Location contains</Label>
        <Input id="location" name="location" defaultValue={f.location} className="h-8" />
      </div>
      <Select name="role" label="Category" value={f.role} options={ROLE_CATEGORIES} />
      <Select name="kind" label="Type" value={f.kind} options={KINDS} />
      <Select name="eligibility" label="Eligibility" value={f.eligibility} options={ELIGIBILITIES} />
      <Select name="status" label="Application" value={f.status} options={APPLICATION_STATUSES} />
      <Select name="deadline" label="Deadline" value={f.deadline} options={DEADLINE_FILTERS} />
      <Select name="comp" label="Compensation" value={f.comp} options={["stated", "not_stated"]} />
      <Select name="listing" label="Listing" value={f.listing} options={LISTING_STATUSES} />
      <div className="grid gap-1">
        <Label htmlFor="min_fit" className="text-xs">Min fit score</Label>
        <Input id="min_fit" name="min_fit" type="number" min={0} max={100} defaultValue={f.min_fit} className="h-8" />
      </div>
      <Select name="sort" label="Sort by" value={f.sort} options={SORTS} />
      <div className="col-span-2 flex gap-2">
        <Button type="submit" size="lg">Apply</Button>
        {activeFilterCount(f) > 0 && <Link className={buttonVariants({ variant: "outline", size: "lg" })} href="/opportunities">Clear</Link>}
      </div>
    </Form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/opportunities">["searchParams"] }) {
  const f = parseFilters(await searchParams);
  const data = await load(f);
  const filtered = activeFilterCount(f) > 0;

  return (
    <>
      <FilterForm f={f} />
      <p className="text-muted-foreground mb-3 text-sm" aria-live="polite">
        {data.length === LIMIT ? `Showing the first ${LIMIT}; narrow the filters to see more.` : `${data.length} result${data.length === 1 ? "" : "s"}`}
      </p>
      {!data.length ? (
        <p className="text-muted-foreground">
          {filtered ? "Nothing matches these filters." : <>No opportunities yet. <Link className="underline" href="/opportunities/new">Add the first one</Link> or <Link className="underline" href="/opportunities/import">import a CSV</Link>.</>}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground border-b text-xs">
              <tr>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Deadline</th>
                <th className="py-2 pr-4 font-medium">Eligibility</th>
                <th className="py-2 pr-4 font-medium">Fit</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-b align-top">
                  <td className="py-2 pr-4">
                    <Link className="font-medium hover:underline" href={`/opportunities/${o.id}`}>{o.title}</Link>
                    <div className="text-muted-foreground">
                      {o.organization}
                      {o.kind === "speculative" && " · speculative"}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{label(o.role_category)}</td>
                  <td className="py-2 pr-4">{o.location ?? "—"}{o.work_mode !== "unknown" && ` · ${label(o.work_mode)}`}</td>
                  <td className="py-2 pr-4">{deadlineText(o.deadline, o.deadline_status)}</td>
                  <td className="py-2 pr-4">{label(o.eligibility)}</td>
                  <td className="py-2 pr-4 tabular-nums">{o.fit_score ?? "—"}</td>
                  <td className="py-2 pr-4">{label(o.applications?.status)}</td>
                  <td className="py-2">{fmtDate(o.discovered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Opportunities</h1>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href="/opportunities/import">Import CSV</Link>
          <Link className={buttonVariants()} href="/opportunities/new">Add opportunity</Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
      <p className="text-muted-foreground mt-6 text-sm">
        Export CSV:{" "}
        {/* Plain <a download>: these are file downloads from route handlers, not pages. */}
        <a className="underline" href="/export/opportunities" download>opportunities</a> ·{" "}
        <a className="underline" href="/export/applications" download>applications</a> ·{" "}
        <a className="underline" href="/export/outreach" download>outreach</a>
      </p>
    </main>
  );
}
