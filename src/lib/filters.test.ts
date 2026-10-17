import { describe, expect, it } from "vitest";
import { activeFilterCount, orValue, parseFilters } from "./filters";

describe("parseFilters", () => {
  it("defaults to no filters, newest first", () => {
    const f = parseFilters({});
    expect(f.sort).toBe("discovered");
    expect(activeFilterCount(f)).toBe(0);
  });

  it("keeps valid values and drops invalid ones instead of failing", () => {
    const f = parseFilters({
      q: "  ml ",
      kind: "posting",
      role: "astronaut",
      eligibility: "eligible",
      status: "applied",
      deadline: "14d",
      min_fit: "70",
      comp: "maybe",
      sort: "random",
      location: "",
    });
    expect(f).toEqual({
      q: "ml", kind: "posting", role: undefined, eligibility: "eligible", status: "applied", listing: undefined,
      location: undefined, comp: undefined, deadline: "14d", min_fit: 70, sort: "discovered",
    });
    expect(activeFilterCount(f)).toBe(6); // q, kind, eligibility, status, deadline, min_fit
  });

  it("takes the first value of repeated params and rejects out-of-range numbers", () => {
    expect(parseFilters({ kind: ["speculative", "posting"], min_fit: "150" })).toMatchObject({ kind: "speculative", min_fit: undefined });
  });
});

it("orValue quotes PostgREST syntax characters", () => {
  expect(orValue('a,b.(c)"d\\')).toBe('"a,b.(c)\\"d\\\\"');
});
