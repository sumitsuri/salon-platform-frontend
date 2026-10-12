import type { UsageHealthStatus } from "@/lib/api";

export const HEALTH_META: Record<
  UsageHealthStatus,
  { label: string; hint: string; text: string; bg: string; dot: string; ring: string }
> = {
  HEALTHY: {
    label: "Healthy",
    hint: "Broad, regular use and holding steady or growing",
    text: "text-emerald-800 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    dot: "bg-emerald-500",
    ring: "#10b981",
  },
  WATCH: {
    label: "Needs attention",
    hint: "Usage is shallow or uneven — worth a check-in",
    text: "text-amber-800 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    dot: "bg-amber-500",
    ring: "#f59e0b",
  },
  AT_RISK: {
    label: "At risk",
    hint: "Low adoption or a steep drop versus the previous period",
    text: "text-red-800 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/40",
    dot: "bg-red-500",
    ring: "#ef4444",
  },
  DORMANT: {
    label: "Dormant",
    hint: "No activity in the last 14 days",
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    dot: "bg-slate-400",
    ring: "#94a3b8",
  },
  NEW: {
    label: "New",
    hint: "First period with activity — no baseline yet",
    text: "text-sky-800 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    dot: "bg-sky-500",
    ring: "#0ea5e9",
  },
};

export const SEGMENT_ORDER: UsageHealthStatus[] = ["AT_RISK", "WATCH", "DORMANT", "NEW", "HEALTHY"];

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

/** Percent change, or null when there is no previous baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function relativeTime(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return "Never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day} d ago`;
  const wk = Math.round(day / 7);
  if (day < 60) return `${wk} wk ago`;
  return `${Math.round(day / 30)} mo ago`;
}

export function absoluteTime(iso?: string | null): string {
  if (!iso) return "No activity recorded";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Days since an instant — used to colour "last active" (fresh / ageing / stale). */
export function daysSince(iso?: string | null, now: number = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((now - t) / 86_400_000);
}

export function recencyTone(iso?: string | null): "fresh" | "ageing" | "stale" | "never" {
  const d = daysSince(iso);
  if (d == null) return "never";
  if (d <= 3) return "fresh";
  if (d <= 14) return "ageing";
  return "stale";
}

export function roleLabel(role: string): string {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
