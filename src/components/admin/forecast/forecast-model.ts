import type { ForecastDay, ForecastScope } from "@/lib/api";

/** Rounds a chart ceiling up to a tidy number so axis labels read cleanly. */
export function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

export type ChartPoint = {
  date: string;
  actual?: number;
  expected?: number;
  low?: number;
  high?: number;
  events: string[];
};

/** History followed by forecast, as one list of days for the chart. */
export function chartPoints(scope: ForecastScope, historyDays: number): ChartPoint[] {
  const history = scope.history.slice(-historyDays).map<ChartPoint>((h) => ({ date: h.date, actual: h.revenue, events: [] }));
  const ahead = scope.days.map<ChartPoint>((d) => ({ date: d.date, expected: d.expected, low: d.low, high: d.high, events: d.events }));
  return [...history, ...ahead];
}

export type Week = { start: string; end: string; expected: number; low: number; high: number; events: string[] };

/** Forecast days grouped into calendar weeks (Monday to Sunday), for planning week by week. */
export function weeklyTotals(days: ForecastDay[]): Week[] {
  const weeks: Week[] = [];
  let current: Week | null = null;
  for (const d of days) {
    const dow = (new Date(`${d.date}T00:00:00`).getDay() + 6) % 7;
    if (!current || dow === 0) {
      current = { start: d.date, end: d.date, expected: 0, low: 0, high: 0, events: [] };
      weeks.push(current);
    }
    current.end = d.date;
    current.expected += d.expected;
    current.low += d.low;
    current.high += d.high;
    for (const e of d.events) if (!current.events.includes(e)) current.events.push(e);
  }
  return weeks;
}

/** Change from one amount to another as a fraction, or null when there is nothing to compare with. */
export function changeFrom(now: number, before: number): number | null {
  if (!Number.isFinite(before) || before <= 0) return null;
  return now / before - 1;
}

export function sumLast(history: { revenue: number }[], days: number): number {
  return history.slice(-days).reduce((s, h) => s + h.revenue, 0);
}

export function percent(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function signedPercent(v: number, digits = 0): string {
  const p = (v * 100).toFixed(digits);
  return `${v > 0 ? "+" : ""}${p}%`;
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
}
