import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { addDays, daysAgo, fmtDate, todayIST } from "@/lib/format";
import { label } from "@/lib/opportunity";
import { IN_PROGRESS } from "@/lib/tracking";

type Item = { key: string; href: string; primary: string; secondary?: string };
type Opp = { id: string; title: string; organization: string };
const NOT_APPLIED = ["discovered", "to_review", "ready_to_apply"];
const FINISHED = ["offer", "rejected", "withdrawn"];

function Panel({ title, count, items, empty, more }: { title: string; count: number; items: Item[]; empty: string; more?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{count}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {items.length === 0 ? (
          <p className="text-muted-foreground">{empty}</p>
        ) : (
          <ul className="grid gap-2">
            {items.map((i) => (
              <li key={i.key}>
                <Link className="font-medium hover:underline" href={i.href}>{i.primary}</Link>
                {i.secondary && <div className="text-muted-foreground text-xs">{i.secondary}</div>}
              </li>
            ))}
          </ul>
        )}
        {more && count > items.length && <Link className="mt-3 inline-block text-xs underline" href={more}>View all {count}</Link>}
      </CardContent>
    </Card>
  );
}

// Without generated DB types, supabase-js types many-to-one embeds as arrays; at runtime they are objects.
const check = <T,>(label: string, r: { data: unknown; error: { message: string } | null; count?: number | null }) => {
  if (r.error) throw new Error(`Failed to load "${label}": ${r.error.message}`);
  return { data: r.data as T, count: r.count ?? 0 };
};
const oppItem = (o: Opp, secondary?: string): Item => ({ key: o.id, href: `/opportunities/${o.id}`, primary: o.title, secondary: secondary ? `${o.organization} · ${secondary}` : o.organization });

async function Panels() {
  const supabase = await db();
  const today = todayIST();
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);
  const opp = "id, title, organization";

  const [fresh, topFit, deadlines, eligibility, contactNeeded, drafts, inProgress, outreachDue, appsDue, outcomes, activity, total] = await Promise.all([
    supabase.from("opportunities").select(`${opp}, discovered_at`, { count: "exact" }).gte("discovered_at", weekAgo).order("discovered_at", { ascending: false }).limit(5),
    supabase.from("opportunities").select(`${opp}, fit_score`, { count: "exact" }).not("fit_score", "is", null).order("fit_score", { ascending: false }).limit(5),
    supabase.from("opportunities").select(`${opp}, deadline, applications!inner(status)`, { count: "exact" })
      .gte("deadline", today).lte("deadline", addDays(today, 14)).not("listing_status", "in", "(closed,expired)")
      .in("applications.status", NOT_APPLIED).order("deadline").limit(5),
    supabase.from("opportunities").select(`${opp}, eligibility`, { count: "exact" }).in("eligibility", ["unknown", "potentially_eligible"])
      .not("listing_status", "in", "(closed,expired)").order("discovered_at", { ascending: false }).limit(5),
    supabase.from("outreach").select("id, status, style, opportunities(id, title, organization)", { count: "exact" })
      .in("status", ["contact_needed", "researching_contact"]).order("created_at").limit(5),
    supabase.from("outreach").select("id, status, contacts(name), opportunities(id, title, organization)", { count: "exact" })
      .in("status", ["draft_ready", "awaiting_approval"]).order("updated_at", { ascending: false }).limit(5),
    supabase.from("applications").select("id, status, applied_at, opportunities(id, title, organization)", { count: "exact" })
      .in("status", [...IN_PROGRESS]).order("updated_at", { ascending: false }).limit(5),
    supabase.from("outreach").select("id, follow_up_due, contacts(name), opportunities(id, title, organization)", { count: "exact" })
      .lte("follow_up_due", today).not("status", "in", "(replied,closed)").order("follow_up_due").limit(5),
    supabase.from("applications").select("id, next_action, next_action_due, opportunities(id, title, organization)", { count: "exact" })
      .lte("next_action_due", today).not("status", "in", `(${FINISHED.join(",")})`).order("next_action_due").limit(5),
    supabase.from("applications").select("id, status, updated_at, opportunities(id, title, organization)", { count: "exact" })
      .in("status", ["interview", "offer", "rejected"]).order("updated_at", { ascending: false }).limit(5),
    supabase.from("events").select("kind, detail").gte("occurred_at", monthAgo).limit(5000),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
  ]);

  type O = { opportunities: Opp };
  const f = check<(Opp & { discovered_at: string })[]>("New this week", fresh);
  const t = check<(Opp & { fit_score: number })[]>("Highest fit", topFit);
  const d = check<(Opp & { deadline: string })[]>("Deadlines", deadlines);
  const e = check<(Opp & { eligibility: string })[]>("Eligibility", eligibility);
  const c = check<({ id: string; style: string; status: string } & O)[]>("Contacts needed", contactNeeded);
  const dr = check<({ id: string; status: string; contacts: { name: string } | null } & O)[]>("Drafts", drafts);
  const p = check<({ id: string; status: string; applied_at: string | null } & O)[]>("In progress", inProgress);
  const od = check<({ id: string; follow_up_due: string; contacts: { name: string } | null } & O)[]>("Outreach follow-ups", outreachDue);
  const ad = check<({ id: string; next_action: string | null; next_action_due: string } & O)[]>("Application follow-ups", appsDue);
  const oc = check<({ id: string; status: string; updated_at: string } & O)[]>("Outcomes", outcomes);
  const a = check<{ kind: string; detail: Record<string, unknown> }[]>("Activity", activity);
  const totalCount = check("Total", total).count;

  const followUps: Item[] = [
    ...od.data.map((x) => ({ ...oppItem(x.opportunities, `email ${x.contacts?.name ?? ""} · due ${fmtDate(x.follow_up_due)}`), key: `o${x.id}` })),
    ...ad.data.map((x) => ({ ...oppItem(x.opportunities, `${x.next_action ?? "next action"} · due ${fmtDate(x.next_action_due)}`), key: `a${x.id}` })),
  ].slice(0, 5);
  const act = {
    added: a.data.filter((x) => x.kind === "discovery").length,
    applied: a.data.filter((x) => x.kind === "status_change" && x.detail.target === "application" && x.detail.to === "applied").length,
    sent: a.data.filter((x) => x.kind === "status_change" && x.detail.target === "outreach" && x.detail.to === "sent").length,
    logged: a.data.filter((x) => ["note", "interview", "response"].includes(x.kind)).length,
  };

  return (
    <>
      {totalCount === 0 && (
        <p className="text-muted-foreground mb-6">
          No opportunities yet. <Link className="underline" href="/opportunities/new">Add one</Link> or{" "}
          <Link className="underline" href="/opportunities/import">import a CSV</Link> to get started.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel title="Deadlines in 14 days" count={d.count} items={d.data.map((o) => oppItem(o, `due ${fmtDate(o.deadline)}`))}
          empty="No upcoming deadlines on roles you haven't applied to." more="/opportunities?deadline=14d&sort=deadline" />
        <Panel title="Follow-ups due" count={od.count + ad.count} items={followUps} empty="Nothing due today." />
        <Panel title="Applications in progress" count={p.count}
          items={p.data.map((x) => ({ ...oppItem(x.opportunities, `${label(x.status)}${x.applied_at ? ` · applied ${fmtDate(x.applied_at)}` : ""}`), key: x.id }))}
          empty="No applications in progress." more="/opportunities?status=applied" />
        <Panel title="New this week" count={f.count} items={f.data.map((o) => oppItem(o, `added ${fmtDate(o.discovered_at)}`))}
          empty="Nothing new in the last 7 days." more="/opportunities?sort=discovered" />
        <Panel title="Highest fit" count={t.count} items={t.data.map((o) => oppItem(o, `fit ${o.fit_score}`))}
          empty="Nothing scored yet. Fit scoring arrives with the matching milestone." more="/opportunities?sort=fit" />
        <Panel title="Eligibility to review" count={e.count} items={e.data.map((o) => oppItem(o, label(o.eligibility)))}
          empty="Every open role has an eligibility call." more="/opportunities?eligibility=unknown" />
        <Panel title="Contacts needed" count={c.count}
          items={c.data.map((x) => ({ ...oppItem(x.opportunities, `${label(x.style)} · ${label(x.status)}`), key: x.id }))}
          empty="No outreach waiting on a contact." />
        <Panel title="Drafts awaiting approval" count={dr.count}
          items={dr.data.map((x) => ({ ...oppItem(x.opportunities, `${x.contacts?.name ?? ""} · ${label(x.status)}`), key: x.id }))}
          empty="No drafts waiting." />
        <Panel title="Interviews and outcomes" count={oc.count}
          items={oc.data.map((x) => ({ ...oppItem(x.opportunities, `${label(x.status)} · ${fmtDate(x.updated_at)}`), key: x.id }))}
          empty="No interviews or outcomes yet." more="/opportunities?status=interview" />
        <Card>
          <CardHeader>
            <CardDescription>Last 30 days</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{act.added + act.applied + act.sent + act.logged}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="grid gap-1">
              <li>{act.added} opportunities added</li>
              <li>{act.applied} applications submitted</li>
              <li>{act.sent} emails marked sent</li>
              <li>{act.logged} notes, interviews and responses logged</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Internship Hunter</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Panels />
      </Suspense>
    </main>
  );
}
