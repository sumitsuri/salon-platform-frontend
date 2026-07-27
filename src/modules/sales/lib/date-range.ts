export type DateRangePreset =
  | "today"
  | "last_week"
  | "last_30_days"
  | "last_60_days"
  | "custom";

export interface SalesDateRange {
  preset: DateRangePreset;
  from: string;
  to: string;
}

/** Presets shown in the dropdown, in order. */
export const DATE_RANGE_PRESET_ORDER: DateRangePreset[] = [
  "today",
  "last_week",
  "last_30_days",
  "last_60_days",
  "custom",
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function todayDate(): Date {
  return startOfDay(new Date());
}

/**
 * Rolling window ending today (inclusive).
 * e.g. 7 days → today minus 6 days through today.
 */
export function getRollingDaysRange(days: number): Pick<SalesDateRange, "from" | "to"> {
  const end = todayDate();
  const start = addDays(end, -(days - 1));
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

/** Today only. */
export function getTodayRange(): Pick<SalesDateRange, "from" | "to"> {
  const iso = toIsoDate(todayDate());
  return { from: iso, to: iso };
}

/** Last 7 days including today. */
export function getLastWeekRange(): Pick<SalesDateRange, "from" | "to"> {
  return getRollingDaysRange(7);
}

/** Last 30 days including today. */
export function getLast30DaysRange(): Pick<SalesDateRange, "from" | "to"> {
  return getRollingDaysRange(30);
}

/** Last 60 days including today. */
export function getLast60DaysRange(): Pick<SalesDateRange, "from" | "to"> {
  return getRollingDaysRange(60);
}

export function getDefaultDateRange(): SalesDateRange {
  const { from, to } = getLastWeekRange();
  return { preset: "last_week", from, to };
}

export function resolvePresetRange(preset: DateRangePreset): Pick<SalesDateRange, "from" | "to"> {
  switch (preset) {
    case "today":
      return getTodayRange();
    case "last_week":
      return getLastWeekRange();
    case "last_30_days":
      return getLast30DaysRange();
    case "last_60_days":
      return getLast60DaysRange();
    case "custom":
      return getDefaultDateRange();
  }
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  last_week: "Last week",
  last_30_days: "Last 30 days",
  last_60_days: "Last 60 days",
  custom: "Custom range",
};

export function formatDateRangeLabel(from: string, to: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (from === to) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

export function parseDateRangeFromSearchParams(
  params: URLSearchParams
): SalesDateRange {
  const raw = params.get("range");
  const preset = DATE_RANGE_PRESET_ORDER.includes(raw as DateRangePreset)
    ? (raw as DateRangePreset)
    : "last_week";

  // Presets always recompute from today — never trust stale from/to in URL.
  if (preset !== "custom") {
    const resolved = resolvePresetRange(preset);
    return { preset, ...resolved };
  }

  const fromParam = params.get("from");
  const toParam = params.get("to");
  if (fromParam && toParam) {
    return { preset: "custom", from: fromParam, to: toParam };
  }

  return getDefaultDateRange();
}

export function dateRangeToSearchParams(range: SalesDateRange): URLSearchParams {
  const q = new URLSearchParams();
  q.set("range", range.preset);
  if (range.preset === "custom") {
    q.set("from", range.from);
    q.set("to", range.to);
  }
  return q;
}

export function todayIsoDate(): string {
  return toIsoDate(todayDate());
}

/** ISO Monday of the week containing the given date (YYYY-MM-DD). */
export function weekStartFromIso(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toIsoDate(d);
}
