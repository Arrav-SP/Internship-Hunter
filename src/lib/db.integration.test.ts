// Runs against the local Supabase database; skipped when it isn't running.
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(".env.local");
} catch {}
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
const supabase = SUPABASE_URL && SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
  : null;
const reachable = !!supabase && !(await supabase.from("opportunities").select("id").limit(1)).error;

const tag = `itest-${Date.now()}`;
const base = { organization: `Org ${tag}`, title: "Intern", source: "manual" };

describe.skipIf(!reachable)("database constraints", () => {
  const db = supabase!;
  afterAll(async () => {
    await db.from("opportunities").delete().like("organization", `%${tag}%`);
  });

  it("creates an application and a discovery event for each new opportunity", async () => {
    const inserted = await db
      .from("opportunities")
      .insert({ ...base, canonical_url: `https://example.com/${tag}/1` })
      .select("id")
      .single();
    expect(inserted.error).toBeNull();
    // Separate read: the insert's own RETURNING can't see rows its trigger created.
    const { data } = await db
      .from("opportunities")
      .select("applications(status), events(kind)")
      .eq("id", inserted.data!.id)
      .single();
    expect(data!.applications).toEqual({ status: "discovered" });
    expect(data!.events).toEqual([{ kind: "discovery" }]);
  });

  it("rejects a duplicate canonical URL", async () => {
    const { error } = await db.from("opportunities").insert({ ...base, title: "Other", canonical_url: `https://example.com/${tag}/1` });
    expect(error?.code).toBe("23505");
  });

  it("rejects a duplicate source id", async () => {
    const row = { ...base, source: "greenhouse", source_id: tag };
    expect((await db.from("opportunities").insert({ ...row, canonical_url: `https://example.com/${tag}/2` })).error).toBeNull();
    expect((await db.from("opportunities").insert({ ...row, canonical_url: `https://example.com/${tag}/3` })).error?.code).toBe("23505");
  });

  it("dedupes URL-less records on kind + organization + title, case-insensitively", async () => {
    const row = { ...base, kind: "speculative", title: "Research Intern" };
    expect((await db.from("opportunities").insert(row)).error).toBeNull();
    const { error } = await db.from("opportunities").insert({ ...row, organization: row.organization.toUpperCase(), title: "research intern" });
    expect(error?.code).toBe("23505");
    // Same title as a posting is a different record.
    expect((await db.from("opportunities").insert({ ...row, kind: "posting" })).error).toBeNull();
  });

  it("requires a date exactly when the deadline is stated", async () => {
    const bad = await db.from("opportunities").insert({ ...base, title: "No date", deadline_status: "stated" });
    expect(bad.error?.code).toBe("23514");
    const bad2 = await db.from("opportunities").insert({ ...base, title: "Date", deadline: "2027-01-01", deadline_status: "unknown" });
    expect(bad2.error?.code).toBe("23514");
  });

  it("allows only one application per opportunity", async () => {
    const { data } = await db.from("opportunities").select("id").eq("canonical_url", `https://example.com/${tag}/1`).single();
    const { error } = await db.from("applications").insert({ opportunity_id: data!.id });
    expect(error?.code).toBe("23505");
  });
});
