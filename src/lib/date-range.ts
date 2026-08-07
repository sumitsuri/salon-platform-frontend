/** Standard product-wide date range presets (CEO, manager, platform, sales). */
export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_30_days"
  | "last_60_days"
  | "last_3_months"
  | "last_6_months"
  | "last_1_year"
  | "custom";

/** @deprecated Legacy sales URL preset — mapped to last_30_days on read. */
export type LegacyDateRangePreset = "last_week";

export interface ProductDateRange {
  preset: DateRangePreset;
  from: string;
  to: string;
}

export const DATE_RANGE_PRESET_ORDER: DateRangePreset[] = [
  "today",
  "yesterday",
  "last_30_days",
  "last_60_days",
  "last_3_months",
  "last_6_months",
  "last_1_year",
  "custom",
];

export const DEFAULT_DATE_RANGE_PRESET: DateRangePreset = "last_60_days";

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

function subtractMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() - months);
  return startOfDay(copy);
}

export function todayDate(): Date {
  return startOfDay(new Date());
}

export function todayIsoDate(): string {
  return toIsoDate(todayDate());
}

/** Rolling window ending today (inclusive). N days → today minus (N−1) through today. */
export function getRollingDaysRange(days: number): Pick<ProductDateRange, "from" | "to"> {
  const end = todayDate();
  const start = addDays(end, -(days - 1));
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export function getTodayRange(): Pick<ProductDateRange, "from" | "to"> {
  const iso = todayIsoDate();
  return { from: iso, to: iso };
}

export function getYesterdayRange(): Pick<ProductDateRange, "from" | "to"> {
  const day = addDays(todayDate(), -1);
  const iso = toIsoDate(day);
  return { from: iso, to: iso };
}

export function getLast30DaysRange(): Pick<ProductDateRange, "from" | "to"> {
  return getRollingDaysRange(30);
}

export function getLast60DaysRange(): Pick<ProductDateRange, "from" | "to"> {
  return getRollingDaysRange(60);
}

export function getLast3MonthsRange(): Pick<ProductDateRange, "from" | "to"> {
  const end = todayDate();
  return { from: toIsoDate(subtractMonths(end, 3)), to: toIsoDate(end) };
}

export function getLast6MonthsRange(): Pick<ProductDateRange, "from" | "to"> {
  const end = todayDate();
  return { from: toIsoDate(subtractMonths(end, 6)), to: toIsoDate(end) };
}

export function getLast1YearRange(): Pick<ProductDateRange, "from" | "to"> {
  return getRollingDaysRange(365);
}

export function getDefaultDateRange(): ProductDateRange {
  const { from, to } = resolvePresetRange(DEFAULT_DATE_RANGE_PRESET);
  return { preset: DEFAULT_DATE_RANGE_PRESET, from, to };
}

export function resolvePresetRange(preset: DateRangePreset): Pick<ProductDateRange, "from" | "to"> {
  switch (preset) {
    case "today":
      return getTodayRange();
    case "yesterday":
      return getYesterdayRange();
    case "last_30_days":
      return getLast30DaysRange();
    case "last_60_days":
      return getLast60DaysRange();
    case "last_3_months":
      return getLast3MonthsRange();
    case "last_6_months":
      return getLast6MonthsRange();
    case "last_1_year":
      return getLast1YearRange();
    case "custom":
      return getLast60DaysRange();
  }
}

export function resolveProductDateRange(range: ProductDateRange): ProductDateRange {
  if (range.preset === "custom") {
    return range;
  }
  const resolved = resolvePresetRange(range.preset);
  return { preset: range.preset, ...resolved };
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_30_days: "Last 30 days",
  last_60_days: "Last 60 days",
  last_3_months: "Last 3 months",
  last_6_months: "Last 6 months",
  last_1_year: "Last 1 year",
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

export function formatPresetLabel(preset: DateRangePreset, from: string, to: string): string {
  if (preset === "custom") {
    return `Custom · ${formatDateRangeLabel(from, to)}`;
  }
  return `${DATE_RANGE_PRESET_LABELS[preset]} · ${formatDateRangeLabel(from, to)}`;
}

/** Admin / insights APIs (`startDate`, `endDate`). */
export function toStartEndDates(range: ProductDateRange): { startDate: string; endDate: string } {
  const resolved = resolveProductDateRange(range);
  return { startDate: resolved.from, endDate: resolved.to };
}

/** Sales / guest-voice APIs (`from`, `to` as YYYY-MM-DD). */
export function toFromToDates(range: ProductDateRange): { from: string; to: string } {
  const resolved = resolveProductDateRange(range);
  return { from: resolved.from, to: resolved.to };
}

/** PL / target trend widgets when the main filter spans more than 30 days. */
export function dashboardSecondaryRange(range: ProductDateRange): { startDate: string; endDate: string } {
  if (
    range.preset === "today" ||
    range.preset === "yesterday" ||
    range.preset === "last_30_days"
  ) {
    return toStartEndDates(range);
  }
  return toStartEndDates({ preset: "last_30_days", ...getLast30DaysRange() });
}

/** Guest-voice summary API (full ISO datetimes). */
export function toIsoDateTimeRange(range: ProductDateRange): { from: string; to: string } {
  const { from, to } = resolveProductDateRange(range);
  return {
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  };
}

const LEGACY_PRESET_MAP: Record<string, DateRangePreset> = {
  last_week: "last_30_days",
  week: "last_30_days",
  days60: "last_60_days",
  month: "last_30_days",
  all: "last_60_days",
};

export function normalizePreset(raw: string | null | undefined): DateRangePreset {
  if (raw && DATE_RANGE_PRESET_ORDER.includes(raw as DateRangePreset)) {
    return raw as DateRangePreset;
  }
  if (raw && LEGACY_PRESET_MAP[raw]) {
    return LEGACY_PRESET_MAP[raw];
  }
  return DEFAULT_DATE_RANGE_PRESET;
}

export function parseDateRangeFromSearchParams(params: URLSearchParams): ProductDateRange {
  const preset = normalizePreset(params.get("range"));

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

export function dateRangeToSearchParams(range: ProductDateRange): URLSearchParams {
  const q = new URLSearchParams();
  q.set("range", range.preset);
  if (range.preset === "custom") {
    q.set("from", range.from);
    q.set("to", range.to);
  }
  return q;
}

/** ISO Monday of the week containing the given date (YYYY-MM-DD). Used by sales targets. */
export function weekStartFromIso(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toIsoDate(d);
}
