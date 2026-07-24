"use client";

import Link from "next/link";
import { LucideIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Loading ── */

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="py-16 text-center space-y-3 mp-animate-in">
      <div className="inline-block w-10 h-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
      {label && <p className="text-sm text-[var(--text-tertiary)]">{label}</p>}
    </div>
  );
}

/* ── Stat cards (Market Pulse style) ── */

const ACCENT_STYLES = {
  brand: {
    ring: "ring-indigo-200 dark:ring-indigo-900",
    bar: "from-indigo-500 to-indigo-600",
    icon: "bg-indigo-500",
    glow: "shadow-indigo-500/20",
  },
  emerald: {
    ring: "ring-emerald-200 dark:ring-emerald-900",
    bar: "from-emerald-500 to-emerald-600",
    icon: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  violet: {
    ring: "ring-violet-200 dark:ring-violet-900",
    bar: "from-violet-500 to-violet-600",
    icon: "bg-violet-500",
    glow: "shadow-violet-500/20",
  },
  amber: {
    ring: "ring-amber-200 dark:ring-amber-900",
    bar: "from-amber-500 to-amber-600",
    icon: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
} as const;

export type AccentColor = keyof typeof ACCENT_STYLES;

export function PulseStatCard({
  label,
  value,
  icon: Icon,
  accent = "brand",
  trend,
  delay = 0,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: AccentColor;
  trend?: string;
  delay?: number;
  className?: string;
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm ring-1 transition hover:shadow-md hover:-translate-y-0.5 mp-animate-in",
        a.ring,
        a.glow,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", a.bar)} />
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", a.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-3 tracking-tight tabular-nums break-words min-w-0">
        {value}
      </p>
      <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5 font-semibold uppercase tracking-wide line-clamp-2">
        {label}
      </p>
    </div>
  );
}

/* ── Dashboard hero banner ── */

export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  badge,
  action,
  metric,
  metricLabel,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  metric?: string | number;
  metricLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("hero-banner relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xl mp-animate-in", className)}>
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl mp-pulse-glow" />
      <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-1 min-w-0 space-y-2">
          {eyebrow && <p className="hero-muted text-sm font-medium truncate">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight break-words">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-sm hero-subtitle line-clamp-3 sm:line-clamp-none">{subtitle}</p>}
          {action && <div className="pt-1">{action}</div>}
        </div>
        {metric != null && metricLabel && (
          <div className="flex items-center justify-between sm:block shrink-0 w-full sm:w-auto border-t border-white/15 sm:border-0 pt-3 sm:pt-0">
            <p className="text-[10px] hero-muted uppercase tracking-wider font-bold sm:text-right">{metricLabel}</p>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums sm:mt-0.5 sm:text-right">{metric}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Panel shell (gradient header cards) ── */

export function PanelShell({
  title,
  subtitle,
  icon: Icon,
  action,
  accent = "brand",
  children,
  className,
  padding = true,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  accent?: AccentColor;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  const headerGradients: Record<AccentColor, string> = {
    brand: "from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20",
    emerald: "from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20",
    violet: "from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20",
    amber: "from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in",
        className
      )}
    >
      <div
        className={cn(
          "px-4 sm:px-5 py-3.5 border-b border-[var(--border)] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r",
          headerGradients[accent]
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-[var(--surface)] shadow-sm flex items-center justify-center shrink-0 border border-[var(--border)]">
              <Icon className="w-4 h-4 text-[var(--brand-text)]" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-[var(--text-primary)] text-sm truncate">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 self-end sm:self-auto">{action}</div>}
      </div>
      <div className={padding ? "p-4 sm:p-5" : undefined}>{children}</div>
    </div>
  );
}

/* ── Wizard step indicator ── */

export function WizardSteps({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  const activeLabel = steps[current - 1] ?? "";
  return (
    <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 shadow-sm mp-animate-in", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2" role="list" aria-label="Progress">
        {steps.map((label, i) => {
          const num = i + 1;
          const done = current > num;
          const active = current === num;
          return (
            <div key={label} className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0" role="listitem">
              <div
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 transition-all shadow-sm",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-[var(--brand)] text-[var(--brand-on-brand)] ring-2 ring-[var(--brand-ring)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-tertiary)] border border-[var(--border)]"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : num}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-semibold truncate hidden md:block",
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                )}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 sm:h-1 rounded-full transition-colors min-w-[0.5rem]",
                    done ? "bg-emerald-400" : active ? "bg-[var(--brand)]/30" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)] sm:hidden truncate" aria-live="polite">
        Step {current}: {activeLabel}
      </p>
    </div>
  );
}

/* ── Enterprise table utilities ── */

export const enterpriseTableHead =
  "text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]";

export function EnterpriseTableShell({
  title,
  subtitle,
  accent = "brand",
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  accent?: AccentColor;
  children: React.ReactNode;
  className?: string;
}) {
  const headerGradients: Record<AccentColor, string> = {
    brand: "from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20",
    emerald: "from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20",
    violet: "from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20",
    amber: "from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in",
        className
      )}
    >
      {title && (
        <div
          className={cn(
            "px-4 sm:px-5 py-3 border-b border-[var(--border)] bg-gradient-to-r",
            headerGradients[accent]
          )}
        >
          <h3 className="font-bold text-[var(--text-primary)] text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="responsive-table-wrap">{children}</div>
    </div>
  );
}

/* ── Progress bar with label ── */

export function LabeledProgressBar({
  label,
  value,
  total,
  color = "bg-[var(--brand)]",
  formatValue,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[var(--text-secondary)] font-medium">{label}</span>
        <span className="font-bold tabular-nums">{display}</span>
      </div>
      <div className="h-2.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full mp-bar-fill transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Link pill for panel headers ── */

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-brand text-xs font-semibold flex items-center gap-0.5 hover:opacity-80">
      {children}
    </Link>
  );
}
