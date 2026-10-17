import { describe, expect, it } from "vitest";
import { errorMap, parseProfileForm, profileSchema } from "./profile";

function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

const base: [string, string][] = [
  ["name", "  Test User "],
  ["email", "test@example.com"],
  ["grad_year", "2028"],
  ["cgpa", "8.5"],
  ["target_start", "2027-05-01"],
  ["target_end", "2027-07-31"],
  ["skills", "Python, SQL\nPython,  PyTorch ,"],
  ["work_modes", "onsite"],
  ["work_modes", "remote"],
  ["links.github", "https://github.com/example"],
];

describe("parseProfileForm + profileSchema", () => {
  it("parses scalars, lists and dedupes skills", () => {
    const p = profileSchema.parse(parseProfileForm(form(base)));
    expect(p.name).toBe("Test User");
    expect(p.grad_year).toBe(2028);
    expect(p.cgpa).toBe(8.5);
    expect(p.skills).toEqual(["Python", "SQL", "PyTorch"]);
    expect(p.work_modes).toEqual(["onsite", "remote"]);
    expect(p.degree).toBeNull();
    expect(p.links).toEqual({ github: "https://github.com/example", linkedin: null, portfolio: null, resume: null });
    expect(p.paid_only).toBe(false);
    expect(p.phone).toBeNull();
  });

  it("keeps commas inside one-per-line fields and reads the paid_only checkbox", () => {
    const p = profileSchema.parse(
      parseProfileForm(
        form([
          ...base,
          ["paid_only", "on"],
          ["phone", "+91 98765 43210"],
          ["certifications", "Course A, Org X\n\nCourse B, Org Y"],
          ["coursework", "DSA, OS"],
        ]),
      ),
    );
    expect(p.paid_only).toBe(true);
    expect(p.phone).toBe("+91 98765 43210");
    expect(p.certifications).toEqual(["Course A, Org X", "Course B, Org Y"]);
    expect(p.coursework).toEqual(["DSA", "OS"]);
  });

  it("keeps filled rows in order, drops blank and removed rows", () => {
    const p = profileSchema.parse(
      parseProfileForm(
        form([
          ...base,
          ["experiences.1.title", "Second"],
          ["experiences.1.organization", "B"],
          ["experiences.0.title", "First"],
          ["experiences.0.organization", "A"],
          ["experiences.0.bullets", "did x\n\n did y "],
          ["experiences.2.title", "Gone"],
          ["experiences.2.organization", "C"],
          ["experiences.2.remove", "on"],
          ["experiences.3.title", ""], // untouched blank "add" row
          ["projects.0.name", ""],
          ["projects.0.source", "manual"], // blank row still carries its hidden source
        ]),
      ),
    );
    expect(p.experiences.map((e) => e.title)).toEqual(["First", "Second"]);
    expect(p.experiences[0].bullets).toEqual(["did x", "did y"]);
    expect(p.projects).toEqual([]);
  });

  it("reports field errors with paths", () => {
    const result = profileSchema.safeParse(
      parseProfileForm(
        form([
          ["name", ""],
          ["email", "nope"],
          ["cgpa", "11"],
          ["grad_year", "abc"],
          ["target_start", "2027-07-01"],
          ["target_end", "2027-05-01"],
          ["links.github", "javascript:alert(1)"],
          ["experiences.0.title", "Intern"],
        ]),
      ),
    );
    expect(result.success).toBe(false);
    const errors = errorMap(result.error!);
    expect(Object.keys(errors).sort()).toEqual(
      ["cgpa", "email", "experiences.0.organization", "grad_year", "links.github", "name"].sort(),
    );
  });

  it("rejects target end before start", () => {
    const result = profileSchema.safeParse(
      parseProfileForm(form([["name", "X"], ["target_start", "2027-07-01"], ["target_end", "2027-05-01"]])),
    );
    expect(result.success).toBe(false);
    expect(errorMap(result.error!)).toHaveProperty("target_end");
  });
});
