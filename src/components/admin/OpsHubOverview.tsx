"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronRight, ClipboardList, IndianRupee, Package, UserCheck, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { getLast30DaysRange, getTodayRange } from "@/lib/date-range";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import type { AdminReportingRange } from "@/lib/branch-reporting";
import { cn, formatCurrency } from "@/lib/utils";
import { CompactStatsStrip, type CompactStatItem } from "@/components/CompactStatsStrip";

/**
 * Live figures behind the Operations hub (tablet/desktop). Everything here is specific to the five modules the
 * hub links to; revenue/branch/stylist rollups stay on the Home dashboard. Disabled on phones (no requests).
 */
export function useOpsHubData(enabled: boolean) {
  const range = useMemo(() => getLast30DaysRange(), []);
  const today = useMemo(() => getTodayRange(), []);
  const opsReportingRange = useMemo((): AdminReportingRange => {
    return {
      from: range.from < today.from ? range.from : today.from,
      to: range.to > today.to ? range.to : today.to,
    };
  }, [range.from, range.to, today.from, today.to]);
  const { branchIdsFilter, branchesSelected } = useAdminBranchSelection("all", opsReportingRange);
  const on = enabled && branchesSelected;

  const dashboard = useQuery({
    queryKey: ["ops-hub", "dashboard", branchIdsFilter, range.from, range.to],
    queryFn: () => api.getDashboard({ startDate: range.from, endDate: range.to, branchIds: branchIdsFilter }),
    enabled: on,
  });
  const todayDashboard = useQuery({
    queryKey: ["ops-hub", "dashboard-today", branchIdsFilter, today.from],
    queryFn: () => api.getDashboard({ startDate: today.from, endDate: today.to, branchIds: branchIdsFilter }),
    enabled: on,
  });
  const attendance = useQuery({
    queryKey: ["ops-hub", "attendance", branchIdsFilter, today.from],
    queryFn: () => api.getAttendanceDashboard({ startDate: today.from, endDate: today.to, branchIds: branchIdsFilter }),
    enabled: on,
  });
  const inventory = useQuery({
    queryKey: ["ops-hub", "inventory", branchIdsFilter],
    queryFn: () => api.getInventoryOverview({ branchIds: branchIdsFilter }),
    enabled: on,
  });
  const inProgress = useQuery({
    queryKey: ["ops-hub", "bookings-in-progress"],
    queryFn: () => api.getBookings({ status: "IN_PROGRESS", page: 0, size: 1 }),
    enabled,
  });
  const readyToBill = useQuery({
    queryKey: ["ops-hub", "bookings-ready"],
    queryFn: () => api.getBookings({ status: "READY_FOR_BILLING", page: 0, size: 1 }),
    enabled,
  });
  const customers = useQuery({
    queryKey: ["ops-hub", "customers"],
    queryFn: () => api.listCustomers({ page: 0, size: 1 }),
    enabled,
  });
  const activeCustomers = useQuery({
    queryKey: ["ops-hub", "customers-active", range.from],
    queryFn: () => api.listCustomers({ lastVisitFrom: range.from, page: 0, size: 1 }),
    enabled,
  });
  const services = useQuery({
    queryKey: ["ops-hub", "services"],
    queryFn: () => api.getCatalogServices(false),
    enabled,
  });

  const catalog = useMemo(() => {
    if (!services.data) return undefined;
    const list = services.data;
    const priced = list.filter((s) => (s.listPrice ?? 0) > 0);
    return {
      count: list.length,
      categories: new Set(list.map((s) => s.categoryId)).size,
      avgPrice: priced.length ? priced.reduce((sum, s) => sum + (s.listPrice ?? 0), 0) / priced.length : 0,
    };
  }, [services.data]);

  return {
    dashboard: dashboard.data,
    todayDashboard: todayDashboard.data,
    attendance: attendance.data,
    inventory: inventory.data,
    openInProgress: inProgress.data?.totalElements,
    openReadyToBill: readyToBill.data?.totalElements,
    customerCount: customers.data?.totalElements,
    activeCustomerCount: activeCustomers.data?.totalElements,
    catalog,
    loading: dashboard.isLoading || attendance.isLoading || inventory.isLoading,
  };
}

export type OpsHubData = ReturnType<typeof useOpsHubData>;

export function OpsHubKpis({ data }: { data: OpsHubData }) {
  const t = useTranslations("admin.opsHub");
  const { dashboard, attendance, inventory, loading } = data;

  const lowStock = (inventory?.lowStockCount ?? 0) + (inventory?.outOfStockCount ?? 0);
  const items: CompactStatItem[] = [
    {
      id: "revenue",
      label: t("kpiRevenue"),
      value: formatCurrency(dashboard?.totalRevenue ?? 0),
      icon: IndianRupee,
      accent: "emerald",
      href: "/admin/finance",
    },
    {
      id: "visits",
      label: t("kpiVisits"),
      value: String(dashboard?.totalVisits ?? 0),
      icon: ClipboardList,
      accent: "sky",
      href: "/admin/bookings",
    },
    {
      id: "staff",
      label: t("kpiStaffPresent"),
      value: attendance ? `${attendance.presentToday}/${attendance.totalStaff}` : "–",
      icon: UserCheck,
      accent: "violet",
      href: "/admin/employees",
    },
    {
      id: "stock",
      label: t("kpiStockAlerts"),
      value: String(lowStock),
      icon: Package,
      accent: lowStock > 0 ? "amber" : "emerald",
      href: "/admin/inventory",
    },
  ];

  return (
    <section aria-label={t("pulseTitle")} className="min-w-0 pt-2">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        {t("pulseTitle")} · {t("periodLast30")}
      </p>
      <CompactStatsStrip items={items} loading={loading && !dashboard} testId="ops-hub-kpis" />
    </section>
  );
}

export type OpsTileMetric = { id: string; label: string; value: string; tone?: "default" | "warn" | "risk" };
export type OpsAccent = "violet" | "sky" | "emerald" | "amber" | "brand";

const TILE_STYLES: Record<OpsAccent, { border: string; icon: string }> = {
  violet: { border: "border-violet-200/80 dark:border-violet-900/40", icon: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300" },
  sky: { border: "border-sky-200/80 dark:border-sky-900/40", icon: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200" },
  emerald: { border: "border-emerald-200/80 dark:border-emerald-900/40", icon: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200" },
  amber: { border: "border-amber-200/80 dark:border-amber-900/40", icon: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" },
  brand: { border: "border-[var(--brand-muted)]", icon: "bg-[var(--brand-light)] text-[var(--brand-text)]" },
};

/** Large launcher tile for the Operations hub: module identity on top, its headline figure large, the rest below. */
export function OpsModuleTile({
  href,
  icon: Icon,
  label,
  description,
  accent,
  metrics,
  progress,
  className,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  accent: OpsAccent;
  /** First metric is the headline figure; the rest render as secondary figures. */
  metrics: OpsTileMetric[];
  progress?: { ratio: number; caption: string };
  className?: string;
}) {
  const s = TILE_STYLES[accent];
  const [primary, ...secondary] = metrics;
  const toneClass = (tone?: OpsTileMetric["tone"]) =>
    tone === "risk" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-[var(--text-primary)]";
  const pct = progress ? Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100) : 0;

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full min-w-0 flex-col gap-5 rounded-2xl border bg-[var(--surface)] p-5 shadow-sm touch-manipulation transition hover:bg-[var(--surface-muted)]/30 hover:shadow-md active:scale-[0.995]",
        s.border,
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", s.icon)}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[var(--text-primary)] ui-card-title">{label}</p>
          <p className="mt-1 text-sm leading-snug text-[var(--text-secondary)]">{description}</p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[var(--text-tertiary)] transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      {primary ? (
        <div className="my-auto min-w-0">
          <p className={cn("text-5xl font-bold leading-none tabular-nums tracking-tight", toneClass(primary.tone))}>
            {primary.value}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{primary.label}</p>
          {progress ? (
            <div className="mt-4 max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div className="h-full rounded-full bg-[var(--brand)] transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{progress.caption}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
        {secondary.map((m) => (
          <div key={m.id} className="min-w-0">
            <dd className={cn("text-xl font-bold leading-tight tabular-nums", toneClass(m.tone))}>{m.value}</dd>
            <dt className="mt-1 text-[11px] font-semibold uppercase leading-tight tracking-wide text-[var(--text-tertiary)]">
              {m.label}
            </dt>
          </div>
        ))}
      </dl>
    </Link>
  );
}
