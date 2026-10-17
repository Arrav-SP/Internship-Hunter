import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { OPPORTUNITY_COLUMNS } from "@/lib/opportunity";

type Row = Record<string, unknown>;
type Joined = Row & { opportunities?: Row | null; contacts?: Row | null; applications?: Row | null };

// Each export flattens its joins so the CSV opens as one sheet.
const EXPORTS = {
  // Same column names as CSV import, so an export can be edited and re-imported.
  opportunities: {
    select: "*, applications(status)",
    columns: [...OPPORTUNITY_COLUMNS, "application_status", "source", "fit_score", "discovered_at", "last_verified_at", "id"],
    flatten: (r: Joined): Row => ({ ...r, application_status: r.applications?.status ?? null }),
  },
  applications: {
    select: "*, opportunities(organization, title)",
    columns: ["organization", "title", "status", "applied_at", "next_action", "next_action_due", "notes", "updated_at", "opportunity_id"],
    flatten: (r: Joined): Row => ({ ...r, organization: r.opportunities?.organization ?? null, title: r.opportunities?.title ?? null }),
  },
  outreach: {
    select: "*, opportunities(organization, title), contacts(name, role, email, email_status)",
    columns: [
      "organization", "opportunity_title", "contact_name", "contact_role", "contact_email", "email_status", "style",
      "status", "subject", "body", "sent_at", "replied_at", "follow_up_due", "notes", "opportunity_id",
    ],
    flatten: (r: Joined): Row => ({
      ...r,
      organization: r.opportunities?.organization ?? null,
      opportunity_title: r.opportunities?.title ?? null,
      contact_name: r.contacts?.name ?? null,
      contact_role: r.contacts?.role ?? null,
      contact_email: r.contacts?.email ?? null,
      email_status: r.contacts?.email_status ?? null,
    }),
  },
} as const;

export async function GET(_req: Request, ctx: RouteContext<"/export/[table]">) {
  const { table } = await ctx.params;
  if (!(table in EXPORTS)) return new Response("Unknown export", { status: 404 });
  const spec = EXPORTS[table as keyof typeof EXPORTS];

  const supabase = await db();
  const { data, error } = await supabase.from(table).select(spec.select).order("created_at").returns<Joined[]>();
  if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(data.map(spec.flatten), [...spec.columns]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
