// Query params that only track where a click came from; they never identify a job.
// Note: gh_jid (Greenhouse job id on custom career pages) is deliberately kept.
const TRACKING_PARAMS = new Set(["gh_src", "lever-source", "lever-origin", "fbclid", "gclid", "ref"]);

/**
 * Normalise a URL so the same listing reached via different links dedupes to one key.
 * Returns null for anything that is not a valid http(s) URL.
 */
export function canonicalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.protocol = "https:";
  url.hostname = url.hostname.replace(/^www\./, "");
  url.hash = "";
  url.username = "";
  url.password = "";

  const kept = [...url.searchParams].filter(
    ([key]) => !key.toLowerCase().startsWith("utm_") && !TRACKING_PARAMS.has(key.toLowerCase()),
  );
  kept.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  url.search = new URLSearchParams(kept).toString();

  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}
