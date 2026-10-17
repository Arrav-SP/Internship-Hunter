import { describe, expect, it } from "vitest";
import { canonicalUrl } from "./canonical-url";

describe("canonicalUrl", () => {
  it("dedupes the same listing reached via different links", () => {
    const variants = [
      "https://boards.greenhouse.io/acme/jobs/123",
      "http://boards.greenhouse.io/acme/jobs/123/",
      "https://www.boards.greenhouse.io/acme/jobs/123#apply",
      "https://BOARDS.Greenhouse.io/acme/jobs/123?utm_source=linkedin&gh_src=abc",
      "  https://boards.greenhouse.io/acme/jobs/123?fbclid=x  ",
    ];
    const keys = new Set(variants.map(canonicalUrl));
    expect([...keys]).toEqual(["https://boards.greenhouse.io/acme/jobs/123"]);
  });

  it("keeps params that identify a job, sorted", () => {
    expect(canonicalUrl("https://acme.com/careers?gh_jid=42&b=2&a=1")).toBe(
      "https://acme.com/careers?a=1&b=2&gh_jid=42",
    );
  });

  it("preserves path case and keeps the root slash", () => {
    expect(canonicalUrl("https://jobs.lever.co/Acme/AbC-123")).toBe("https://jobs.lever.co/Acme/AbC-123");
    expect(canonicalUrl("https://acme.com")).toBe("https://acme.com/");
  });

  it("rejects missing, invalid and non-http URLs", () => {
    expect(canonicalUrl(null)).toBeNull();
    expect(canonicalUrl("")).toBeNull();
    expect(canonicalUrl("not a url")).toBeNull();
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("mailto:hr@acme.com")).toBeNull();
  });
});
