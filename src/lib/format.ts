const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** "2026-12-01" -> "1 Dec 2026". Date-only values are formatted in UTC so they never shift a day. */
export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso.slice(0, 10))) : "—");

/** Today's date (YYYY-MM-DD) in IST, used for deadline comparisons. */
export const todayIST = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** Timestamp `days` before now, for "last N days" queries. */
export const daysAgo = (days: number, now = new Date()) => new Date(now.getTime() - days * 86_400_000).toISOString();

/** ISO date `days` after `from`. */
export const addDays = (from: string, days: number) =>
  new Date(Date.parse(from) + days * 86_400_000).toISOString().slice(0, 10);

/** Deadline with its status, so "unknown" and "none stated" never look the same. */
export function deadlineText(deadline: string | null, status: string, today = todayIST()) {
  if (status === "none_stated") return "None stated (rolling)";
  if (status !== "stated" || !deadline) return "Unknown";
  return deadline < today ? `${fmtDate(deadline)} (passed)` : fmtDate(deadline);
}

/** Timestamps are shown in IST. */
export const fmtDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
