import type { BranchDemand, DemandCell, DemandRecommendation } from "@/lib/api";

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** "10a", "12p", "3p" — compact enough for a heatmap header. */
export function hourShort(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  return `${hh % 12 === 0 ? 12 : hh % 12}${hh < 12 ? "a" : "p"}`;
}

/** "10 am", "12 pm". */
export function hourLong(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  return `${hh % 12 === 0 ? 12 : hh % 12} ${hh < 12 ? "am" : "pm"}`;
}

/** [start, end) as "5-8 pm" / "11 am-2 pm". */
export function rangeLong(start: number, end: number): string {
  const s = hourLong(start);
  const e = hourLong(end);
  return s.slice(-2) === e.slice(-2) ? `${s.slice(0, -3)}-${e}` : `${s}-${e}`;
}

export function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Whole number for customers and staff; a real flow never shows as 0. */
export function whole(n: number): string {
  if (!(n > 0)) return "0";
  return String(Math.max(1, Math.round(n)));
}

export function fmt1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Cells keyed by (dow0 * 24 + hour). */
export function cellMap(b: BranchDemand): Map<number, DemandCell> {
  const m = new Map<number, DemandCell>();
  for (const c of b.cells) m.set((c.dow - 1) * 24 + c.hour, c);
  return m;
}

export const cellKey = (dow1: number, hour: number) => (dow1 - 1) * 24 + hour;

/** Customers arriving per hour on an average such weekday. */
export function avgVisits(b: BranchDemand, c: DemandCell | undefined): number {
  if (!c) return 0;
  const occ = b.dowOccurrences[c.dow - 1] || 0;
  return occ > 0 ? c.visits / occ : 0;
}

export function avgRevenue(b: BranchDemand, c: DemandCell | undefined): number {
  if (!c) return 0;
  const occ = b.dowOccurrences[c.dow - 1] || 0;
  return occ > 0 ? c.revenue / occ : 0;
}

/** Staff on the floor on an average such weekday-hour. */
export function avgStaff(b: BranchDemand, c: DemandCell | undefined): number {
  if (!c) return 0;
  const occ = b.dowOccurrences[c.dow - 1] || 0;
  return occ > 0 ? c.staffMinutes / (60 * occ) : 0;
}

/** First and last hour (inclusive) worth drawing: opening hours, widened to any hour that saw customers. */
export function hourSpan(b: BranchDemand): [number, number] {
  let lo = b.openHour;
  let hi = b.closeHour - 1;
  for (const c of b.cells) {
    if (c.visits > 0) {
      lo = Math.min(lo, c.hour);
      hi = Math.max(hi, c.hour);
    }
  }
  return [lo, hi];
}

/** Weekdays (ISO) the branch actually traded on. */
export function openWeekdays(b: BranchDemand): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 7; d++) {
    const occ = b.dowOccurrences[d - 1] || 0;
    const total = b.cells.filter((c) => c.dow === d).reduce((a, c) => a + c.visits, 0);
    if (occ > 0 && total > 0) out.push(d);
  }
  return out;
}

export interface HourPoint {
  hour: number;
  /** Customers arriving in this hour, averaged over the chosen days. */
  visits: number;
  /** Staff on the floor, averaged (0 when attendance is unknown). */
  staff: number;
  /** How busy each person is, in % (null when unknown). */
  busy: number | null;
  state: "STRETCHED" | "OK" | "IDLE" | null;
  revenue: number;
  inHours: boolean;
}

/** One "typical day" for a set of ISO weekdays: per-hour averages across those days. */
export function daySeries(b: BranchDemand, days: number[]): HourPoint[] {
  const [lo, hi] = hourSpan(b);
  const map = cellMap(b);
  const occSum = days.reduce((a, d) => a + (b.dowOccurrences[d - 1] || 0), 0);
  const visitHours = (b.visitMinutes ?? 45) / 60;
  const out: HourPoint[] = [];
  for (let h = lo; h <= hi; h++) {
    let visits = 0;
    let staffMin = 0;
    let revenue = 0;
    const states = { STRETCHED: 0, OK: 0, IDLE: 0 };
    let stated = 0;
    for (const d of days) {
      const c = map.get(cellKey(d, h));
      if (!c) continue;
      visits += c.visits;
      staffMin += c.staffMinutes;
      revenue += c.revenue;
      if (c.state) {
        states[c.state] += 1;
        stated += 1;
      }
    }
    const v = occSum > 0 ? visits / occSum : 0;
    const s = occSum > 0 ? staffMin / (60 * occSum) : 0;
    let state: HourPoint["state"] = null;
    if (stated > 0) {
      // A set of days is "stretched" or "spare" when most of its member days are.
      if (states.STRETCHED * 2 >= stated && states.STRETCHED > 0) state = "STRETCHED";
      else if (states.IDLE * 2 >= stated && states.IDLE > 0) state = "IDLE";
      else state = "OK";
    }
    out.push({
      hour: h,
      visits: v,
      staff: s,
      busy: b.staffDataAvailable && s > 0 ? Math.round(((v * visitHours) / Math.max(s, 0.5)) * 100) : null,
      state,
      revenue: occSum > 0 ? revenue / occSum : 0,
      inHours: h >= b.openHour && h < b.closeHour,
    });
  }
  return out;
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Extra line for the tooltip. */
  detail?: string;
  partial?: boolean;
}

/** Average customers per day for each weekday the branch trades. */
export function weekBars(b: BranchDemand): BarDatum[] {
  const out: BarDatum[] = [];
  for (let d = 1; d <= 7; d++) {
    const occ = b.dowOccurrences[d - 1] || 0;
    if (occ === 0) continue;
    const visits = b.cells.filter((c) => c.dow === d).reduce((a, c) => a + c.visits, 0);
    const revenue = b.cells.filter((c) => c.dow === d).reduce((a, c) => a + c.revenue, 0);
    const perDay = visits / occ;
    out.push({
      key: String(d),
      label: DAY_SHORT[d - 1],
      value: perDay,
      detail: visits === 0 ? "Closed" : `${formatInr(revenue / occ)} billed on an average ${DAY_LONG[d - 1]}`,
    });
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthBars(b: BranchDemand): BarDatum[] {
  return b.months.map((m) => {
    const mi = Number(m.month.slice(5, 7)) - 1;
    return {
      key: m.month,
      label: MONTHS[mi],
      value: m.visitsPerDay,
      partial: m.partial,
      detail: `${m.visits.toLocaleString("en-IN")} customers · ${formatInr(m.revenue)} billed${m.partial ? " so far this month" : ""}`,
    };
  });
}

/** Does a heatmap cell fall inside a recommendation's days and hours? */
export function inRecommendation(rec: DemandRecommendation | null, dow1: number, hour: number): boolean {
  if (!rec || rec.startHour < 0) return false;
  const dayOk = rec.days.length === 0 || rec.days.includes(dow1);
  return dayOk && hour >= rec.startHour && hour < rec.endHour;
}

/** Quantises a value into 0-6 against the max, so the legend can show seven honest steps. */
export function seqBin(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(6, Math.ceil((value / max) * 6)));
}

export type DivBin = "s3" | "s2" | "s1" | "0" | "p1" | "p2" | "p3";

/** Diverging bin from how busy each person is; falls back to the engine's state when attendance is unknown. */
export function divBin(c: DemandCell | undefined): DivBin | null {
  if (!c || !c.state) return null;
  if (c.busyPercent == null) return c.state === "STRETCHED" ? "s2" : c.state === "IDLE" ? "p2" : "0";
  const b = c.busyPercent;
  if (b >= 140) return "s3";
  if (b >= 110) return "s2";
  if (b >= 85) return "s1";
  if (b >= 45) return "0";
  if (b >= 30) return "p1";
  if (b >= 20) return "p2";
  return "p3";
}

export const PERIODS = [
  { id: "28", days: 28 },
  { id: "90", days: 90 },
  { id: "180", days: 180 },
  { id: "365", days: 365 },
] as const;

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function periodRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

/** {1..7} → "every day" / "weekdays" / "weekends" / "Tue-Thu" / "Mon, Wed". */
export function daysLabel(isoDays: number[]): string {
  const set = Array.from(new Set(isoDays)).sort((a, b) => a - b);
  if (set.length === 0) return "";
  if (set.length === 7) return "every day";
  if (set.join() === "6,7") return "weekends";
  if (set.join() === "1,2,3,4,5") return "weekdays";
  if (set.length === 1) return `${DAY_LONG[set[0] - 1]}s`;
  const parts: string[] = [];
  let runStart = set[0];
  let prev = set[0];
  const flush = (from: number, to: number) => {
    if (from === to) parts.push(DAY_SHORT[from - 1]);
    else if (to === from + 1) parts.push(`${DAY_SHORT[from - 1]}, ${DAY_SHORT[to - 1]}`);
    else parts.push(`${DAY_SHORT[from - 1]}-${DAY_SHORT[to - 1]}`);
  };
  for (const d of set.slice(1)) {
    if (d !== prev + 1) {
      flush(runStart, prev);
      runStart = d;
    }
    prev = d;
  }
  flush(runStart, prev);
  return parts.join(", ");
}

/** Round axis ticks: a "nice" step (1, 2, 2.5, 5 × 10ⁿ) and a max that is a whole number of steps. */
export function niceScale(maxValue: number, targetTicks = 5): { max: number; ticks: number[] } {
  if (!(maxValue > 0)) return { max: 4, ticks: [0, 1, 2, 3, 4] };
  const raw = maxValue / (targetTicks - 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const frac = raw / pow;
  const step = Math.max(1, (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow);
  const max = Math.ceil(maxValue / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { max, ticks };
}
