import {
  getTodayRange,
  getYesterdayRange,
  todayDate,
  todayIsoDate,
} from "@/lib/date-range";

export type ManagerHomeDatePreset = "today" | "current_month" | "last_month" | "custom";

export type ManagerHomeDateRange = {
  preset: ManagerHomeDatePreset;
  from: string;
  to: string;
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function getManagerHomeDefaultRange(): ManagerHomeDateRange {
  return { preset: "today", ...getTodayRange() };
}

export function getManagerCurrentMonthRange(): Pick<ManagerHomeDateRange, "from" | "to"> {
  const end = todayDate();
  return { from: toIsoDate(startOfMonth(end)), to: toIsoDate(end) };
}

export function getManagerLastMonthRange(): Pick<ManagerHomeDateRange, "from" | "to"> {
  const today = todayDate();
  const monthStart = startOfMonth(today);
  const prevEnd = addDays(monthStart, -1);
  const prevStart = startOfMonth(prevEnd);
  return { from: toIsoDate(prevStart), to: toIsoDate(prevEnd) };
}

/** Earliest selectable day: first day of previous calendar month. */
export function managerHomeSelectableMinDate(): string {
  return getManagerLastMonthRange().from;
}

export function managerHomeSelectableMaxDate(): string {
  return todayIsoDate();
}

export function resolveManagerHomeRange(range: ManagerHomeDateRange): ManagerHomeDateRange {
  if (range.preset === "today") {
    return { preset: "today", ...getTodayRange() };
  }
  if (range.preset === "current_month") {
    return { preset: "current_month", ...getManagerCurrentMonthRange() };
  }
  if (range.preset === "last_month") {
    return { preset: "last_month", ...getManagerLastMonthRange() };
  }
  const min = managerHomeSelectableMinDate();
  const max = managerHomeSelectableMaxDate();
  let from = range.from;
  let to = range.to;
  if (from < min) from = min;
  if (to > max) to = max;
  if (from > to) from = to;
  return { preset: "custom", from, to };
}

export function previousComparisonRange(
  from: string,
  to: string
): { startDate: string; endDate: string } {
  if (from === to && from === getTodayRange().from) {
    const y = getYesterdayRange();
    return { startDate: y.from, endDate: y.to };
  }
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const dayMs = 86400000;
  const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(lengthDays - 1));
  return { startDate: toIsoDate(prevStart), endDate: toIsoDate(prevEnd) };
}

export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

/** Month-to-date range for branch target tracking aligned with the selected glance date. */
export function branchTargetTrackingRange(resolved: ManagerHomeDateRange): { from: string; to: string } {
  if (resolved.preset === "last_month" || resolved.preset === "current_month") {
    return { from: resolved.from, to: resolved.to };
  }
  const to = resolved.to;
  const d = new Date(`${to}T12:00:00`);
  const from = toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  return { from, to };
}
