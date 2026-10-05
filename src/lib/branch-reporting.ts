import type { Branch } from "@/lib/api";

/** Matches backend BranchReporting.REPORTING_ZONE. */
export const BRANCH_REPORTING_TIME_ZONE = "Asia/Kolkata";

export type AdminReportingRange = { from: string; to: string };

function lastActiveDateIso(branch: Pick<Branch, "status" | "deactivatedAt">): string | null {
  if (branch.status !== "INACTIVE") return null;
  if (!branch.deactivatedAt) return null;
  const d = new Date(branch.deactivatedAt);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRANCH_REPORTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) return null;
  return `${y}-${m}-${day}`;
}

/** True when branch should appear in admin scope/reporting for inclusive calendar range [from, to]. */
export function branchOverlapsReportingRange(
  branch: Pick<Branch, "status" | "deactivatedAt">,
  from: string,
  to: string,
): boolean {
  if (branch.status !== "INACTIVE") return true;
  const last = lastActiveDateIso(branch);
  if (!last) return false;
  return from <= last;
}

/** Full calendar month in yyyy-MM-dd (for finance / inventory month pickers). */
export function calendarMonthReportingRange(monthIso: string): AdminReportingRange {
  const [y, m] = monthIso.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: monthIso,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}
