import { describe, expect, it } from "vitest";
import { planImport } from "./import";

const header = "organization,title,kind,source_url,deadline,deadline_status,eligibility,required_skills,extra_col";

describe("planImport", () => {
  it("validates rows, dedupes within the file and reports unknown columns", () => {
    const csv = [
      header,
      'Acme,ML Intern,Posting,https://acme.com/jobs/1?utm_source=x,2026-12-01,,Potentially eligible,"Python, SQL",ignored',
      "Acme,ML Intern again,posting,https://acme.com/jobs/1/,,,,,", // same listing as line 2
      "Beta Labs,Research Intern,speculative,,,none stated,,,",
      ",No org,posting,https://x.com/1,,,,,", // invalid: no organization
      "Gamma,SWE Intern,posting,,31/12/2026,,,,", // invalid: no URL, bad date
      "beta labs,RESEARCH INTERN,speculative,,,,,,", // same speculative target, different case
    ].join("\n");
    const plan = planImport(csv);
    expect(plan.fileErrors).toEqual([]);
    expect(plan.unknownColumns).toEqual(["extra_col"]);
    expect(plan.rows.map((r) => [r.line, r.status])).toEqual([
      [2, "new"], [3, "duplicate_in_file"], [4, "new"], [5, "invalid"], [6, "invalid"], [7, "duplicate_in_file"],
    ]);
    const first = plan.rows[0].row!;
    expect(first).toMatchObject({
      source: "csv",
      canonical_url: "https://acme.com/jobs/1",
      deadline_status: "stated",
      eligibility: "potentially_eligible",
      eligibility_override: true,
      required_skills: ["Python", "SQL"],
    });
    expect(plan.rows[2].row).toMatchObject({ kind: "speculative", deadline_status: "none_stated", canonical_url: null });
    expect(plan.rows[3].errors.join()).toContain("organization");
    expect(plan.rows[4].errors.join()).toMatch(/deadline/);
    expect(plan.rows[4].errors.join()).toMatch(/source_url/);
  });

  it("rejects files without the required columns", () => {
    expect(planImport("company,role\nAcme,Intern").fileErrors).toEqual([
      'Missing required column "organization".',
      'Missing required column "title".',
    ]);
  });

  it("rejects oversized files", () => {
    expect(planImport("x".repeat(1_000_000)).fileErrors[0]).toMatch(/larger than/);
  });
});
