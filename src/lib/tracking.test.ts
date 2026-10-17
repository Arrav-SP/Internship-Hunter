import { describe, expect, it } from "vitest";
import { errorMap } from "./form";
import {
  contactSchema, outreachSchema, parseContactForm, parseOutreachForm, recentSend, statusTimestamps,
} from "./tracking";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

describe("contacts", () => {
  it("defaults email status from whether an email was given", () => {
    expect(contactSchema.parse(parseContactForm(fd({ organization: "Acme", name: "A" }))).email_status).toBe("not_found");
    expect(contactSchema.parse(parseContactForm(fd({ organization: "Acme", name: "A", email: "a@acme.com" }))).email_status).toBe("unverified");
  });

  it("rejects contradictory email status", () => {
    const noEmailVerified = contactSchema.safeParse(parseContactForm(fd({ organization: "Acme", name: "A", email_status: "verified" })));
    expect(errorMap(noEmailVerified.error!)).toHaveProperty("email_status");
    const emailNotFound = contactSchema.safeParse(parseContactForm(fd({ organization: "Acme", name: "A", email: "a@acme.com", email_status: "not_found" })));
    expect(errorMap(emailNotFound.error!)).toHaveProperty("email_status");
  });

  it("rejects bad emails and non-http profile links", () => {
    const r = contactSchema.safeParse(parseContactForm(fd({ organization: "Acme", name: "A", email: "nope", profile_url: "javascript:x" })));
    expect(Object.keys(errorMap(r.error!))).toEqual(expect.arrayContaining(["email", "profile_url"]));
  });
});

describe("outreach", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("defaults status from whether a contact is chosen", () => {
    expect(outreachSchema.parse(parseOutreachForm(fd({ style: "recruiter" }))).status).toBe("contact_needed");
    expect(outreachSchema.parse(parseOutreachForm(fd({ style: "recruiter", contact_id: id }))).status).toBe("draft_ready");
  });

  it("requires a contact past the research stage", () => {
    const r = outreachSchema.safeParse(parseOutreachForm(fd({ style: "founder", status: "sent" })));
    expect(errorMap(r.error!)).toHaveProperty("status");
  });
});

describe("recentSend (duplicate-email guard)", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const sends = [
    { id: "self", sent_at: "2026-10-16T00:00:00Z" },
    { id: "old", sent_at: "2026-08-01T00:00:00Z" },
    { id: "draft", sent_at: null },
  ];
  it("ignores itself, drafts and old sends", () => {
    expect(recentSend(sends, "self", now)).toBeUndefined();
  });
  it("finds a send to the same contact inside the window", () => {
    expect(recentSend([...sends, { id: "recent", sent_at: "2026-10-01T00:00:00Z" }], "self", now)?.id).toBe("recent");
  });
});

describe("statusTimestamps", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  it("stamps sent/replied once and never overwrites", () => {
    expect(statusTimestamps("sent", { sent_at: null, replied_at: null }, now)).toEqual({ sent_at: now.toISOString(), replied_at: null });
    expect(statusTimestamps("replied", { sent_at: "2026-10-01T00:00:00.000Z", replied_at: null }, now)).toEqual({
      sent_at: "2026-10-01T00:00:00.000Z", replied_at: now.toISOString(),
    });
    expect(statusTimestamps("draft_ready", { sent_at: null, replied_at: null }, now)).toEqual({ sent_at: null, replied_at: null });
  });
});
