import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { deadlineText, fmtDate, fmtDateTime } from "@/lib/format";
import { label } from "@/lib/opportunity";
import { loadContactOptions, loadOpportunity, type Event, type OpportunityDetail } from "../load";
import { DeleteButton } from "./delete-button";
import { ApplicationPanel, LogForm, OutreachForm } from "./tracking";

/** One line of history, e.g. "Application: To review → Applied". */
function describe(e: Event, contactName: Map<string, string>) {
  const d = e.detail;
  if (e.kind === "discovery") return `Added (${String(d.source ?? "")})`;
  if (e.kind === "status_change") {
    const who = d.target === "outreach" ? `Outreach to ${contactName.get(e.outreach_id ?? "") ?? "a deleted entry"}` : "Application";
    return `${who}: ${d.from ? `${label(String(d.from))} → ` : ""}${label(String(d.to))}`;
  }
  const kind = { note: "Note", interview: "Interview", response: "Recruiter response" }[e.kind] ?? e.kind;
  return `${kind}: ${String(d.text ?? "")}`;
}

const ELIGIBILITY_VARIANT = {
  eligible: "default",
  potentially_eligible: "secondary",
  ineligible: "destructive",
  unknown: "outline",
} as const;

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{term}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

function Detail({ o, contacts }: { o: OpportunityDetail; contacts: Awaited<ReturnType<typeof loadContactOptions>> }) {
  const dates = o.start_date || o.end_date ? `${fmtDate(o.start_date)} – ${fmtDate(o.end_date)}` : "Not stated";
  const contactName = new Map(o.outreach.map((x) => [x.id, x.contacts?.name ?? "contact needed"]));

  return (
    <article className="grid gap-8">
      <header className="grid gap-3">
        <p className="text-muted-foreground text-sm">{o.organization}</p>
        <h1 className="text-2xl font-semibold">{o.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant={o.kind === "speculative" ? "secondary" : "outline"}>{label(o.kind)}</Badge>
          <Badge variant="outline">{label(o.role_category)}</Badge>
          <Badge variant={ELIGIBILITY_VARIANT[o.eligibility]}>{label(o.eligibility)}</Badge>
          <Badge variant="outline">Listing: {label(o.listing_status)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {o.apply_url && <a className={buttonVariants()} href={o.apply_url} {...external}>Apply ↗</a>}
          {o.source_url && <a className={buttonVariants({ variant: "outline" })} href={o.source_url} {...external}>Listing ↗</a>}
          <Link className={buttonVariants({ variant: "outline" })} href={`/opportunities/${o.id}/edit`}>Edit</Link>
          <DeleteButton id={o.id} title={o.title} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact term="Deadline">{deadlineText(o.deadline, o.deadline_status)}</Fact>
        <Fact term="Dates">{dates}{o.duration_text && ` (${o.duration_text})`}</Fact>
        <Fact term="Location">{o.location ?? "Not stated"} · {label(o.work_mode)}</Fact>
        <Fact term="Compensation">{o.compensation_text ?? "Not stated"}</Fact>
        <Fact term="Application status">{label(o.applications?.status)}</Fact>
        <Fact term="Posted">{fmtDate(o.posted_at)}</Fact>
        <Fact term="Discovered">{fmtDateTime(o.discovered_at)} via {o.source}</Fact>
        <Fact term="Last verified">{o.last_verified_at ? fmtDateTime(o.last_verified_at) : "Never"}</Fact>
      </dl>

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Application</h2>
        {o.applications ? (
          <ApplicationPanel opportunityId={o.id} app={o.applications} />
        ) : (
          <p className="text-destructive text-sm">No application record found for this opportunity.</p>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Outreach</h2>
        <p className="text-muted-foreground text-sm">
          {o.kind === "posting"
            ? "Apply through the official link first; outreach complements the application."
            : "No advertised opening: outreach is the way in. Keep it to one or two well-chosen people."}
        </p>
        {o.outreach.length === 0 && <p className="text-muted-foreground text-sm">No outreach yet.</p>}
        {o.outreach.map((x) => (
          <details key={x.id} className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm">
              <span className="font-medium">{x.contacts?.name ?? "Contact needed"}</span>
              {x.contacts?.role && ` · ${x.contacts.role}`} · {label(x.style)} ·{" "}
              <span className="font-medium">{label(x.status)}</span>
              {x.sent_at && ` · sent ${fmtDate(x.sent_at)}`}
              {x.follow_up_due && ` · follow up ${fmtDate(x.follow_up_due)}`}
              {x.contacts && (
                <span className="text-muted-foreground">
                  {" "}· {x.contacts.email ? `${x.contacts.email} (${label(x.contacts.email_status)})` : "no public email found"}
                </span>
              )}
            </summary>
            <div className="mt-4">
              <OutreachForm opportunityId={o.id} organization={o.organization} contacts={contacts} outreach={x} />
            </div>
          </details>
        ))}
        <details className="rounded-md border border-dashed p-3">
          <summary className="cursor-pointer text-sm font-medium">Add outreach</summary>
          <div className="mt-4">
            <OutreachForm opportunityId={o.id} organization={o.organization} contacts={contacts} />
          </div>
        </details>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-medium">Eligibility</h2>
        <p className="text-sm">
          <span className="font-medium">{label(o.eligibility)}</span>
          {o.eligibility_reason && `: ${o.eligibility_reason}`}
          {o.eligibility_override && <span className="text-muted-foreground"> (set by you)</span>}
        </p>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
          {o.eligibility_text ? `Listing says: ${o.eligibility_text}` : "The listing's eligibility requirement hasn't been recorded."}
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-medium">Skills</h2>
        <p className="text-sm">Required: {o.required_skills.length ? o.required_skills.join(", ") : "Not stated"}</p>
        <p className="text-sm">Preferred: {o.preferred_skills.length ? o.preferred_skills.join(", ") : "Not stated"}</p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-medium">Fit</h2>
        <p className="text-muted-foreground text-sm">
          {o.fit_score === null ? "Not scored yet. Scoring arrives with the matching milestone." : `${o.fit_score}/100`}
        </p>
      </section>

      {o.description && (
        <section className="grid gap-2">
          <h2 className="text-lg font-medium">Description</h2>
          {/* Imported text is untrusted: rendered as plain text, never as HTML. */}
          <p className="text-sm whitespace-pre-wrap">{o.description}</p>
        </section>
      )}

      {o.notes && (
        <section className="grid gap-2">
          <h2 className="text-lg font-medium">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{o.notes}</p>
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">History</h2>
        <LogForm opportunityId={o.id} />
        <ol className="grid gap-1 text-sm">
          {o.events.map((e) => (
            <li key={e.id} className="whitespace-pre-wrap">
              <span className="text-muted-foreground">{fmtDateTime(e.occurred_at)}</span> · {describe(e, contactName)}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

export default async function OpportunityPage({ params }: PageProps<"/opportunities/[id]">) {
  // Load before returning any JSX: notFound() must run before the response starts streaming.
  const { id } = await params;
  const [o, contacts] = await Promise.all([loadOpportunity(id), loadContactOptions()]);
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Link href="/opportunities" className="text-muted-foreground mb-4 inline-block text-sm">← All opportunities</Link>
      <Detail o={o} contacts={contacts} />
    </main>
  );
}
