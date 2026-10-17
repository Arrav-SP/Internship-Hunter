import { describe, expect, it } from "vitest";
import { errorMap } from "./form";
import { dedupeUrl, escapeLike, opportunitySchema, parseOpportunityForm, toRow } from "./opportunity";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

const posting = {
  organization: " Acme ",
  title: "ML Intern",
  source_url: "https://boards.greenhouse.io/acme/jobs/1?utm_source=x",
  required_skills: "Python, SQL, Python",
};

describe("opportunity form + schema", () => {
  it("applies defaults and normalises", () => {
    const o = opportunitySchema.parse(parseOpportunityForm(form(posting)));
    expect(o).toMatchObject({
      kind: "posting",
      organization: "Acme",
      role_category: "other",
      work_mode: "unknown",
      deadline: null,
      deadline_status: "unknown",
      listing_status: "unknown",
      eligibility: "unknown",
      required_skills: ["Python", "SQL"],
      compensation_text: null,
    });
  });

  it("keeps unknown vs none-stated deadlines distinct, and a date always means stated", () => {
    const parse = (extra: Record<string, string>) =>
      opportunitySchema.parse(parseOpportunityForm(form({ ...posting, ...extra })));
    expect(parse({ deadline_status: "none_stated" })).toMatchObject({ deadline: null, deadline_status: "none_stated" });
    expect(parse({ deadline_status: "stated" })).toMatchObject({ deadline: null, deadline_status: "unknown" });
    expect(parse({ deadline: "2026-12-01", deadline_status: "none_stated" })).toMatchObject({
      deadline: "2026-12-01",
      deadline_status: "stated",
    });
  });

  it("requires a URL for postings but not for speculative targets", () => {
    const noUrl = { organization: "Acme", title: "Intern" };
    const r = opportunitySchema.safeParse(parseOpportunityForm(form(noUrl)));
    expect(r.success).toBe(false);
    expect(errorMap(r.error!)).toHaveProperty("source_url");
    expect(opportunitySchema.safeParse(parseOpportunityForm(form({ ...noUrl, kind: "speculative" }))).success).toBe(true);
  });

  it("rejects bad input with field paths", () => {
    const r = opportunitySchema.safeParse(
      parseOpportunityForm(
        form({ organization: "", title: "", apply_url: "javascript:alert(1)", kind: "bogus", deadline: "31/12/2026" }),
      ),
    );
    expect(r.success).toBe(false);
    expect(Object.keys(errorMap(r.error!))).toEqual(
      expect.arrayContaining(["organization", "title", "apply_url", "kind", "deadline"]),
    );
  });

  it("rejects end before start", () => {
    const r = opportunitySchema.safeParse(
      parseOpportunityForm(form({ ...posting, start_date: "2027-07-01", end_date: "2027-05-01" })),
    );
    expect(errorMap(r.error!)).toHaveProperty("end_date");
  });
});

describe("toRow / dedupeUrl", () => {
  it("dedupes on the listing URL before the apply URL", () => {
    expect(dedupeUrl({ source_url: "https://acme.com/jobs/1#x", apply_url: "https://acme.com/apply" })).toBe(
      "https://acme.com/jobs/1",
    );
    expect(dedupeUrl({ source_url: null, apply_url: "https://acme.com/apply/" })).toBe("https://acme.com/apply");
    expect(dedupeUrl({ source_url: null, apply_url: null })).toBeNull();
  });

  it("marks manual eligibility calls as overrides", () => {
    const o = opportunitySchema.parse(parseOpportunityForm(form({ ...posting, eligibility: "eligible" })));
    expect(toRow(o)).toMatchObject({
      eligibility_override: true,
      canonical_url: "https://boards.greenhouse.io/acme/jobs/1",
    });
    const u = opportunitySchema.parse(parseOpportunityForm(form(posting)));
    expect(toRow(u).eligibility_override).toBe(false);
  });
});

it("escapeLike escapes wildcards", () => {
  expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
});
