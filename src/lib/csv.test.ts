import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("csv", () => {
  const rows = [
    { org: "Acme, Inc.", title: 'He said "hi"', notes: "line 1\nline 2", skills: ["Python", "SQL"], pay: null },
    { org: "Café Ünïcode ₹", title: "=HYPERLINK(\"http://evil\")", notes: "+1 call", skills: [], pay: "-5" },
  ];

  it("round-trips commas, quotes, newlines, unicode and lists", () => {
    const csv = toCsv(rows, ["org", "title", "notes", "skills", "pay"]);
    expect(csv.startsWith("﻿")).toBe(true);
    const parsed = parseCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.fields).toEqual(["org", "title", "notes", "skills", "pay"]);
    expect(parsed.rows[0]).toEqual({ org: "Acme, Inc.", title: 'He said "hi"', notes: "line 1\nline 2", skills: "Python, SQL", pay: "" });
    expect(parsed.rows[1].org).toBe("Café Ünïcode ₹");
  });

  it("neutralises formula cells on export and restores them on import", () => {
    const csv = toCsv(rows, ["title", "notes", "pay"]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain("'+1 call");
    expect(csv).toContain("'-5");
    const back = parseCsv(csv).rows[1];
    expect(back).toEqual({ title: '=HYPERLINK("http://evil")', notes: "+1 call", pay: "-5" });
  });

  it("normalises headers and skips blank lines", () => {
    const parsed = parseCsv(" Organization ,TITLE\r\nAcme,Intern\r\n\r\n,\r\n");
    expect(parsed.fields).toEqual(["organization", "title"]);
    expect(parsed.rows).toEqual([{ organization: "Acme", title: "Intern" }]);
  });

  it("reports malformed rows", () => {
    const parsed = parseCsv('organization,title\nAcme,"unterminated\n');
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});
