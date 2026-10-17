import { expect, it } from "vitest";
import { addDays, deadlineText, fmtDate, todayIST } from "./format";

it("computes today in IST and adds days across month ends", () => {
  expect(todayIST(new Date("2026-10-17T20:00:00Z"))).toBe("2026-10-18"); // 01:30 IST next day
  expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
});

it("formats date-only values without shifting a day", () => {
  expect(fmtDate("2026-12-01")).toBe("1 Dec 2026");
  expect(fmtDate("2026-12-01T23:30:00+00:00")).toBe("1 Dec 2026");
  expect(fmtDate(null)).toBe("—");
});

it("keeps unknown, none-stated and passed deadlines distinct", () => {
  const today = "2026-10-17";
  expect(deadlineText(null, "unknown", today)).toBe("Unknown");
  expect(deadlineText(null, "none_stated", today)).toBe("None stated (rolling)");
  expect(deadlineText("2026-11-01", "stated", today)).toBe("1 Nov 2026");
  expect(deadlineText("2026-10-01", "stated", today)).toBe("1 Oct 2026 (passed)");
});
