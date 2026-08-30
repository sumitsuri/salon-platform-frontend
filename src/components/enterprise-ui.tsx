"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LucideIcon, Check, ChevronDown, ChevronUp } from "lucide-react";
import { AttendancePhotoThumb } from "@/components/AttendancePhotoThumb";
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
    ring: "ring-[color-mix(in_srgb,var(--brand)_25%,transparent)]",
    bar: "from-[var(--brand)] to-[var(--brand-dark)]",
    icon: "bg-[var(--brand)]",
    glow: "shadow-[var(--shadow-color)]",
  },
  emerald: {
    ring: "ring-emerald-200 dark:ring-emerald-900",
    bar: "from-emerald-500 to-emerald-600",
    icon: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  violet: {
    ring: "ring-[color-mix(in_srgb,var(--brand)_25%,transparent)]",
    bar: "from-[var(--brand)] to-[var(--brand-dark)]",
    icon: "bg-[var(--brand)]",
    glow: "shadow-[var(--shadow-color)]",
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
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 shadow-sm ring-1 transition hover:shadow-md hover:-translate-y-0.5 mp-animate-in min-w-0 max-w-full",
        a.ring,
        a.glow,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", a.bar)} />
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0", a.icon)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0 truncate max-w-[45%]">
            {trend}
          </span>
        )}
      </div>
      <p className="text-base sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] mt-2 sm:mt-3 tracking-tight tabular-nums truncate min-w-0">
        {value}
      </p>
      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5 font-semibold uppercase tracking-wide line-clamp-2 break-words">
        {label}
      </p>
    </div>
  );
}

/* ── Dashboard hero banner ── */

export function DashboardCommandBar({
  title,
  subtitle,
  eyebrow,
  periodLabel,
  branchesLabel,
  shortcutsLabel,
  action,
  filters,
  links,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  periodLabel?: string;
  branchesLabel?: string;
  shortcutsLabel?: string;
  action?: React.ReactNode;
  filters?: React.ReactNode;
  links?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-command-bar min-w-0 max-w-full", className)}>
      <div className="dashboard-command-bar-header flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="dashboard-command-bar-accent hidden sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="dashboard-command-bar-eyebrow">{eyebrow}</p>}
            <h1 className="dashboard-command-bar-title">{title}</h1>
            {subtitle && <p className="dashboard-command-bar-subtitle">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <div className="dashboard-command-bar-period shrink-0 w-full sm:w-auto min-w-0 sm:max-w-[20rem]">
            <div>{action}</div>
          </div>
        )}
      </div>
      {(filters || links) && (
        <div className="dashboard-command-bar-toolbar grid grid-cols-1 gap-2.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
          {filters && <div className="min-w-0 w-full sm:max-w-xs">{filters}</div>}
          {links && <div className="dashboard-command-bar-links min-w-0 w-full sm:w-auto">{links}</div>}
        </div>
      )}
    </div>
  );
}

export function DashboardQuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="dashboard-quick-link inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition active:scale-[0.98] touch-manipulation sm:w-auto sm:justify-start"
    >
      <span className="dashboard-quick-link-icon flex h-6 w-6 items-center justify-center rounded-md shrink-0">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {label}
    </Link>
  );
}

export function DashboardOverviewPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("dashboard-overview-panel", className)}>{children}</section>;
}

/** Standalone dashboard table widget shell (spaced like bottom teasers). */
export function DashboardWidgetCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("dashboard-widget-card min-w-0 max-w-full", className)}>{children}</div>;
}

/** Side-by-side employee check-in + sales tables (stacks on mobile). */
export function DashboardEmployeeTablesRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("dashboard-employee-tables-row", className)}>{children}</div>;
}

export function DashboardKpiStrip({
  items,
  loading,
  headerLabel,
  className,
}: {
  items: { label: string; value: string | number }[];
  loading?: boolean;
  headerLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-kpi-strip min-w-0 max-w-full", className)}>
      {headerLabel && (
        <div className="dashboard-kpi-strip-header px-4 py-3">
          <h2 className="dashboard-kpi-strip-title">{headerLabel}</h2>
        </div>
      )}
      <div className="dashboard-kpi-strip-grid">
        {items.map((item) => (
          <div key={item.label} className="dashboard-kpi-strip-cell min-w-0 px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="dashboard-kpi-strip-cell-label truncate">{item.label}</p>
            <p className="dashboard-kpi-strip-cell-value truncate">{loading ? "…" : item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const BRANCH_PERFORMANCE_VISIBLE_ROWS = 5;

export type BranchPerformanceRow = {
  branchId: string;
  branchName: string;
  revenue: number;
  visits: number;
  avgTicket: number;
  discountAmount: number;
};

export function DashboardBranchPerformance({
  branches,
  loading,
  headerLabel,
  labels,
  formatValue,
  branchHref,
  className,
}: {
  branches: BranchPerformanceRow[];
  loading?: boolean;
  headerLabel: string;
  labels: {
    branch: string;
    revenue: string;
    visits: string;
    avgTicket: string;
    discounts: string;
  };
  formatValue: (amount: number) => string;
  /** When set, each branch row links to a branch-scoped detail page (e.g. bookings). */
  branchHref?: (branch: BranchPerformanceRow) => string;
  className?: string;
}) {
  const sortedBranches = [...branches].sort(
    (a, b) => b.revenue - a.revenue || a.branchName.localeCompare(b.branchName),
  );
  const placeholderRows = loading
    ? Array.from({ length: BRANCH_PERFORMANCE_VISIBLE_ROWS }, (_, i) => i)
    : sortedBranches;
  const totalBranchRevenue = loading
    ? 0
    : sortedBranches.reduce((sum, b) => sum + b.revenue, 0);
  const hasMoreBranches = !loading && sortedBranches.length > BRANCH_PERFORMANCE_VISIBLE_ROWS;

  function branchRevenueShare(revenue: number) {
    if (totalBranchRevenue <= 0 || revenue <= 0) return null;
    return Math.round((revenue / totalBranchRevenue) * 100);
  }

  const desktopGrid =
    "hidden lg:grid lg:grid-cols-[minmax(0,1.4fr)_4.5rem_5.5rem_5.5rem_6.5rem_2.75rem] lg:items-center lg:gap-3";

  return (
    <div className={cn("dashboard-branch-performance min-w-0 max-w-full", className)}>
      <div className="dashboard-branch-performance-header px-4 py-3">
        <h2 className="dashboard-kpi-strip-title">{headerLabel}</h2>
      </div>

      <div
        className={cn(
          "dashboard-branch-performance-scroll-wrap",
          hasMoreBranches && "dashboard-branch-performance-scroll-wrap--more",
        )}
      >
        <div
          className={cn(
            desktopGrid,
            "border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]",
          )}
          aria-hidden
        >
          <span>{labels.branch}</span>
          <span className="text-right">{labels.visits}</span>
          <span className="text-right">{labels.avgTicket}</span>
          <span className="text-right">{labels.discounts}</span>
          <span className="text-right">{labels.revenue}</span>
          <span className="text-right">%</span>
        </div>

        <div
          className="dashboard-branch-performance-scroll divide-y divide-[var(--border)]"
          role="region"
          aria-label={headerLabel}
          tabIndex={hasMoreBranches ? 0 : undefined}
        >
          {placeholderRows.map((row, i) => {
            const branch = loading ? null : (row as BranchPerformanceRow);
            const sharePct = branch ? branchRevenueShare(branch.revenue) : null;
            const href = branch && branchHref ? branchHref(branch) : undefined;
            const rowClassName = cn(
              "dashboard-branch-performance-row-item block px-3 py-2.5 transition-colors hover:bg-[var(--surface-muted)]/35 sm:px-4 lg:py-0 lg:px-4",
              href && "cursor-pointer touch-manipulation",
            );
            const rowInner = (
              <>
                <div className="lg:hidden">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">
                      {loading ? "…" : branch!.branchName}
                    </p>
                    <div className="shrink-0 text-right leading-tight">
                      <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {loading ? "…" : formatValue(branch!.revenue)}
                      </p>
                      {sharePct != null && sharePct > 0 && (
                        <p className="text-[10px] tabular-nums text-[var(--text-tertiary)]">{sharePct}%</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[11px] leading-snug text-[var(--text-secondary)] sm:text-xs">
                    <span className="tabular-nums">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {loading ? "…" : branch!.visits}
                      </span>{" "}
                      {labels.visits}
                    </span>
                    <span className="text-[var(--text-tertiary)]" aria-hidden>
                      ·
                    </span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {loading ? "…" : formatValue(branch!.avgTicket)}
                      </span>{" "}
                      {labels.avgTicket}
                    </span>
                    <span className="text-[var(--text-tertiary)]" aria-hidden>
                      ·
                    </span>
                    <span className="tabular-nums text-amber-700 dark:text-amber-400">
                      <span className="font-semibold">
                        {loading ? "…" : formatValue(branch!.discountAmount)}
                      </span>{" "}
                      {labels.discounts}
                    </span>
                  </div>
                </div>

                <div className={cn(desktopGrid, "min-h-[2.75rem] py-2")}>
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                    {loading ? "…" : branch!.branchName}
                  </p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                    {loading ? "…" : branch!.visits}
                  </p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                    {loading ? "…" : formatValue(branch!.avgTicket)}
                  </p>
                  <p className="text-right text-sm tabular-nums font-medium text-amber-700 dark:text-amber-400">
                    {loading ? "…" : formatValue(branch!.discountAmount)}
                  </p>
                  <p className="text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {loading ? "…" : formatValue(branch!.revenue)}
                  </p>
                  <p className="text-right text-xs tabular-nums text-[var(--text-tertiary)]">
                    {loading ? "…" : sharePct != null && sharePct > 0 ? `${sharePct}%` : "—"}
                  </p>
                </div>
              </>
            );

            const key = branch?.branchId ?? `loading-${i}`;
            if (href) {
              return (
                <Link key={key} href={href} className={rowClassName}>
                  {rowInner}
                </Link>
              );
            }

            return (
              <div key={key} className={rowClassName}>
                {rowInner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type EmployeeCheckInRow = {
  staffId: string;
  staffName: string;
  attendanceRecordId?: string;
  entryTime?: string;
  exitTime?: string;
  hasEntryPhoto?: boolean;
};

function defaultFormatCheckTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type SortDirection = "asc" | "desc";

function DashboardSortHeader({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
        active ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {active ? (
        direction === "asc" ? (
          <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
        )
      ) : null}
    </button>
  );
}

function toggleSort<T extends string>(
  column: T,
  activeColumn: T,
  direction: SortDirection,
  setColumn: (col: T) => void,
  setDirection: (dir: SortDirection) => void,
  defaultDesc: boolean,
) {
  if (activeColumn === column) {
    setDirection(direction === "asc" ? "desc" : "asc");
  } else {
    setColumn(column);
    setDirection(defaultDesc ? "desc" : "asc");
  }
}

const CHECKIN_TABLE_GRID =
  "grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-2 sm:gap-x-3";

const SALES_TABLE_GRID =
  "grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(3.25rem,1fr)_minmax(3.75rem,1fr)] items-center gap-x-2 sm:gap-x-3";

function StaffAvatar({
  name,
  recordId,
  hasPhoto,
  className,
}: {
  name: string;
  recordId?: string;
  hasPhoto?: boolean;
  className?: string;
}) {
  if (recordId && hasPhoto) {
    return <AttendancePhotoThumb recordId={recordId} type="entry" className={cn("w-9 h-9", className)} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-secondary)]",
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function DashboardEmployeeCheckIn({
  staff,
  loading,
  headerLabel,
  emptyLabel,
  labels,
  formatTime = defaultFormatCheckTime,
  staffHref,
  className,
}: {
  staff: EmployeeCheckInRow[];
  loading?: boolean;
  headerLabel: string;
  emptyLabel: string;
  labels: {
    staff: string;
    checkIn: string;
    checkOut: string;
  };
  formatTime?: (iso?: string) => string;
  staffHref?: (row: EmployeeCheckInRow) => string;
  className?: string;
}) {
  type CheckInSortKey = "name" | "checkIn" | "checkOut";
  const [sortColumn, setSortColumn] = useState<CheckInSortKey>("checkIn");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedStaff = useMemo(() => {
    const rows = [...staff];
    const dir = sortDirection === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortColumn) {
        case "name":
          return dir * a.staffName.localeCompare(b.staffName);
        case "checkIn": {
          const aTime = a.entryTime ? new Date(a.entryTime).getTime() : -1;
          const bTime = b.entryTime ? new Date(b.entryTime).getTime() : -1;
          return dir * (aTime - bTime);
        }
        case "checkOut": {
          const aTime = a.exitTime ? new Date(a.exitTime).getTime() : -1;
          const bTime = b.exitTime ? new Date(b.exitTime).getTime() : -1;
          return dir * (aTime - bTime);
        }
        default:
          return 0;
      }
    });
    return rows;
  }, [staff, sortColumn, sortDirection]);

  const placeholderRows = loading
    ? Array.from({ length: BRANCH_PERFORMANCE_VISIBLE_ROWS }, (_, i) => i)
    : sortedStaff.length > 0
      ? sortedStaff
      : [];
  const hasMoreRows = !loading && sortedStaff.length > BRANCH_PERFORMANCE_VISIBLE_ROWS;
  const headerRowClass = cn(
    CHECKIN_TABLE_GRID,
    "border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2 sm:px-4",
  );
  const bodyRowClass = cn(CHECKIN_TABLE_GRID, "min-h-[2.75rem] px-3 py-2 sm:px-4");

  return (
    <div className={cn("dashboard-branch-performance min-w-0 max-w-full", className)}>
      <div className="dashboard-branch-performance-header px-4 py-3">
        <h2 className="dashboard-kpi-strip-title">{headerLabel}</h2>
      </div>

      <div
        className={cn(
          "dashboard-branch-performance-scroll-wrap",
          hasMoreRows && "dashboard-branch-performance-scroll-wrap--more",
        )}
      >
        <div className={headerRowClass} role="row">
          <DashboardSortHeader
            label={labels.staff}
            active={sortColumn === "name"}
            direction={sortDirection}
            onClick={() => toggleSort("name", sortColumn, sortDirection, setSortColumn, setSortDirection, false)}
          />
          <DashboardSortHeader
            label={labels.checkIn}
            active={sortColumn === "checkIn"}
            direction={sortDirection}
            onClick={() => toggleSort("checkIn", sortColumn, sortDirection, setSortColumn, setSortDirection, true)}
            className="ml-auto"
          />
          <DashboardSortHeader
            label={labels.checkOut}
            active={sortColumn === "checkOut"}
            direction={sortDirection}
            onClick={() => toggleSort("checkOut", sortColumn, sortDirection, setSortColumn, setSortDirection, true)}
            className="ml-auto"
          />
        </div>

        <div
          className="dashboard-branch-performance-scroll divide-y divide-[var(--border)]"
          role="region"
          aria-label={headerLabel}
          tabIndex={hasMoreRows ? 0 : undefined}
        >
          {!loading && sortedStaff.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">{emptyLabel}</p>
          ) : (
            placeholderRows.map((row, i) => {
              const item = loading ? null : (row as EmployeeCheckInRow);
              const href = item && staffHref ? staffHref(item) : undefined;
              const rowClassName = cn(
                "dashboard-branch-performance-row-item block transition-colors hover:bg-[var(--surface-muted)]/35",
                href && "cursor-pointer touch-manipulation",
              );
              const rowInner = (
                <div className={bodyRowClass}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {loading ? (
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
                    ) : (
                      <StaffAvatar
                        name={item!.staffName}
                        recordId={item!.attendanceRecordId}
                        hasPhoto={item!.hasEntryPhoto}
                      />
                    )}
                    <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {loading ? "…" : item!.staffName}
                    </p>
                  </div>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                    {loading ? "…" : formatTime(item!.entryTime)}
                  </p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                    {loading ? "…" : formatTime(item!.exitTime)}
                  </p>
                </div>
              );

              const key = item?.staffId ?? `loading-${i}`;
              if (href) {
                return (
                  <Link key={key} href={href} className={rowClassName}>
                    {rowInner}
                  </Link>
                );
              }

              return (
                <div key={key} className={rowClassName}>
                  {rowInner}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export type EmployeeSalesRow = {
  staffId: string;
  staffName: string;
  salesCount: number;
  avgTicketSize: number;
  totalSales: number;
};

export function DashboardEmployeeSales({
  staff,
  loading,
  headerLabel,
  emptyLabel,
  labels,
  formatValue,
  staffHref,
  className,
}: {
  staff: EmployeeSalesRow[];
  loading?: boolean;
  headerLabel: string;
  emptyLabel: string;
  labels: {
    name: string;
    count: string;
    avgTicket: string;
    sales: string;
  };
  formatValue: (amount: number) => string;
  staffHref?: (row: EmployeeSalesRow) => string;
  className?: string;
}) {
  type SalesSortKey = "name" | "count" | "avgTicket" | "sales";
  const [sortColumn, setSortColumn] = useState<SalesSortKey>("sales");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedStaff = useMemo(() => {
    const rows = [...staff];
    const dir = sortDirection === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortColumn) {
        case "name":
          return dir * a.staffName.localeCompare(b.staffName);
        case "count":
          return dir * (a.salesCount - b.salesCount);
        case "avgTicket":
          return dir * (a.avgTicketSize - b.avgTicketSize);
        case "sales":
          return dir * (a.totalSales - b.totalSales);
        default:
          return 0;
      }
    });
    return rows;
  }, [staff, sortColumn, sortDirection]);

  const placeholderRows = loading
    ? Array.from({ length: BRANCH_PERFORMANCE_VISIBLE_ROWS }, (_, i) => i)
    : sortedStaff.length > 0
      ? sortedStaff
      : [];
  const hasMoreRows = !loading && sortedStaff.length > BRANCH_PERFORMANCE_VISIBLE_ROWS;
  const headerRowClass = cn(
    SALES_TABLE_GRID,
    "border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2 sm:px-4",
  );
  const bodyRowClass = cn(SALES_TABLE_GRID, "min-h-[2.75rem] px-3 py-2 sm:px-4");

  return (
    <div className={cn("dashboard-branch-performance min-w-0 max-w-full", className)}>
      <div className="dashboard-branch-performance-header px-4 py-3">
        <h2 className="dashboard-kpi-strip-title">{headerLabel}</h2>
      </div>

      <div
        className={cn(
          "dashboard-branch-performance-scroll-wrap",
          hasMoreRows && "dashboard-branch-performance-scroll-wrap--more",
        )}
      >
        <div className={headerRowClass} role="row">
          <DashboardSortHeader
            label={labels.name}
            active={sortColumn === "name"}
            direction={sortDirection}
            onClick={() => toggleSort("name", sortColumn, sortDirection, setSortColumn, setSortDirection, false)}
          />
          <DashboardSortHeader
            label={labels.count}
            active={sortColumn === "count"}
            direction={sortDirection}
            onClick={() => toggleSort("count", sortColumn, sortDirection, setSortColumn, setSortDirection, true)}
            className="ml-auto"
          />
          <DashboardSortHeader
            label={labels.avgTicket}
            active={sortColumn === "avgTicket"}
            direction={sortDirection}
            onClick={() => toggleSort("avgTicket", sortColumn, sortDirection, setSortColumn, setSortDirection, true)}
            className="ml-auto"
          />
          <DashboardSortHeader
            label={labels.sales}
            active={sortColumn === "sales"}
            direction={sortDirection}
            onClick={() => toggleSort("sales", sortColumn, sortDirection, setSortColumn, setSortDirection, true)}
            className="ml-auto"
          />
        </div>

        <div
          className="dashboard-branch-performance-scroll divide-y divide-[var(--border)]"
          role="region"
          aria-label={headerLabel}
          tabIndex={hasMoreRows ? 0 : undefined}
        >
          {!loading && sortedStaff.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">{emptyLabel}</p>
          ) : (
            placeholderRows.map((row, i) => {
              const item = loading ? null : (row as EmployeeSalesRow);
              const href = item && staffHref ? staffHref(item) : undefined;
              const rowClassName = cn(
                "dashboard-branch-performance-row-item block transition-colors hover:bg-[var(--surface-muted)]/35",
                href && "cursor-pointer touch-manipulation",
              );
              const rowInner = (
                <div className={bodyRowClass}>
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                    {loading ? "…" : item!.staffName}
                  </p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                    {loading ? "…" : item!.salesCount}
                  </p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                    {loading ? "…" : formatValue(item!.avgTicketSize)}
                  </p>
                  <p className="text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {loading ? "…" : formatValue(item!.totalSales)}
                  </p>
                </div>
              );

              const key = item?.staffId ?? `loading-${i}`;
              if (href) {
                return (
                  <Link key={key} href={href} className={rowClassName}>
                    {rowInner}
                  </Link>
                );
              }

              return (
                <div key={key} className={rowClassName}>
                  {rowInner}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className={cn("hero-banner relative overflow-hidden rounded-2xl p-4 sm:p-6 shadow-xl mp-animate-in min-w-0 max-w-full w-full", className)}>
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl mp-pulse-glow" />
      <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 min-w-0">
        <div className="flex-1 min-w-0 space-y-2">
          {eyebrow && <p className="hero-muted text-sm font-medium truncate">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight break-words min-w-0">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-sm hero-subtitle line-clamp-2 sm:line-clamp-none">{subtitle}</p>}
          {action && <div className="pt-1">{action}</div>}
        </div>
        {metric != null && metricLabel && (
          <div className="flex items-center justify-between sm:block shrink-0 w-full sm:w-auto min-w-0 border-t border-white/15 sm:border-0 pt-3 sm:pt-0 sm:max-w-[45%]">
            <p className="text-[10px] hero-muted uppercase tracking-wider font-bold sm:text-right truncate">{metricLabel}</p>
            <p className="text-xl sm:text-3xl font-bold tabular-nums sm:mt-0.5 sm:text-right truncate">{metric}</p>
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
    brand: "from-[var(--brand-light)] to-[var(--surface-muted)]",
    emerald: "from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20",
    violet: "from-[var(--brand-light)] to-[var(--surface-muted)]",
    amber: "from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in min-w-0 max-w-full w-full",
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
  onStepSelect,
}: {
  steps: string[];
  current: number;
  className?: string;
  /** When set, completed (and current) steps are clickable to navigate back. */
  onStepSelect?: (step: number) => void;
}) {
  const activeLabel = steps[current - 1] ?? "";
  return (
    <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 shadow-sm mp-animate-in", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2" role="list" aria-label="Progress">
        {steps.map((label, i) => {
          const num = i + 1;
          const done = current > num;
          const active = current === num;
          const clickable = !!onStepSelect && num < current;
          return (
            <div key={label} className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0" role="listitem">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepSelect?.(num)}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 transition-all shadow-sm",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-[var(--brand)] text-[var(--brand-on-brand)] ring-2 ring-[var(--brand-ring)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-tertiary)] border border-[var(--border)]",
                  clickable && "cursor-pointer hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]",
                  !clickable && "cursor-default"
                )}
                aria-current={active ? "step" : undefined}
                aria-label={clickable ? `Go to ${label}` : label}
              >
                {done ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : num}
              </button>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepSelect?.(num)}
                className={cn(
                  "text-[10px] sm:text-xs font-semibold truncate hidden md:block text-left bg-transparent border-0 p-0",
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]",
                  clickable && "cursor-pointer hover:text-[var(--text-primary)]"
                )}
              >
                {label}
              </button>
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
    brand: "from-[var(--brand-light)] to-[var(--surface-muted)]",
    emerald: "from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20",
    violet: "from-[var(--brand-light)] to-[var(--surface-muted)]",
    amber: "from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in min-w-0 max-w-full w-full",
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
      <div className="min-w-0">{children}</div>
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
