"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  Package,
  Scissors,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { getLast30DaysRange, getTodayRange } from "@/lib/date-range";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { cn, formatCurrency } from "@/lib/utils";
import { CompactStatsStrip, type CompactStatItem } from "@/components/CompactStatsStrip";
import { StatusBadge } from "@/components/ui";

/** Live figures behind the Operations hub. Disabled (no requests) on phones, which only show the module list. */
export function useOpsHubData(enabled: boolean) {
  const { branchIdsFilter, branchesSelected } = useAdminBranchSelection();
  const on = enabled && branchesSelected;
  const range = useMemo(() => getLast30DaysRange(), []);
  const today = useMemo(() => getTodayRange(), []);

  const dashboard = useQuery({
    queryKey: ["ops-hub", "dashboard", branchIdsFilter, range.from, range.to],
    queryFn: () => api.getDashboard({ startDate: range.from, endDate: range.to, branchIds: branchIdsFilter }),
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
  const customers = useQuery({
    queryKey: ["ops-hub", "customers"],
    queryFn: () => api.listCustomers({ page: 0, size: 1 }),
    enabled,
  });
  const recentBookings = useQuery({
    queryKey: ["ops-hub", "recent-bookings"],
    queryFn: () => api.getBookings({ page: 0, size: 6 }),
    enabled,
  });
  const services = useQuery({
    queryKey: ["ops-hub", "services"],
    queryFn: () => api.getCatalogServices(false),
    enabled,
  });

  return {
    dashboard: dashboard.data,
    attendance: attendance.data,
    inventory: inventory.data,
    customerCount: customers.data?.totalElements,
    serviceCount: services.data?.length,
    recentBookings: (recentBookings.data?.content ?? []).slice(0, 6),
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

function PanelHead({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
      <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="dashboard-overview-section-title">{title}</h2>
        {hint ? <p className="dashboard-overview-section-hint">{hint}</p> : null}
      </div>
    </div>
  );
}

type AttentionItem = { id: string; tone: "warn" | "risk"; text: string; href: string };

export function OpsHubPanels({ data }: { data: OpsHubData }) {
  const t = useTranslations("admin.opsHub");
  const { dashboard, attendance, inventory, loading, recentBookings } = data;

  const attention = useMemo(() => {
    const list: AttentionItem[] = [];
    if (attendance && attendance.absentToday > 0) {
      list.push({ id: "absent", tone: "warn", text: t("attentionAbsent", { count: attendance.absentToday }), href: "/admin/employees" });
    }
    if (inventory && inventory.outOfStockCount > 0) {
      list.push({ id: "out", tone: "risk", text: t("attentionOutOfStock", { count: inventory.outOfStockCount }), href: "/admin/inventory" });
    }
    if (inventory && inventory.lowStockCount > 0) {
      list.push({ id: "low", tone: "warn", text: t("attentionLowStock", { count: inventory.lowStockCount }), href: "/admin/inventory" });
    }
    const quiet = dashboard?.branchStats.filter((b) => b.visits === 0).length ?? 0;
    if (quiet > 0) {
      list.push({ id: "quiet", tone: "warn", text: t("attentionQuietBranches", { count: quiet }), href: "/admin/bookings" });
    }
    return list;
  }, [attendance, inventory, dashboard, t]);

  const branches = useMemo(
    () => [...(dashboard?.branchStats ?? [])].sort((a, b) => b.revenue - a.revenue),
    [dashboard],
  );
  const maxRevenue = Math.max(1, ...branches.map((b) => b.revenue));
  const topServices = dashboard?.topServices.slice(0, 6) ?? [];
  const topStaff = dashboard?.topStaff.slice(0, 6) ?? [];
  const mix = dashboard?.paymentMix;
  const mixTotal = mix ? mix.cash + mix.upi + mix.card : 0;
  const mixRows = mix
    ? [
        { id: "upi", label: t("payUpi"), value: mix.upi, color: "bg-violet-500" },
        { id: "cash", label: t("payCash"), value: mix.cash, color: "bg-emerald-500" },
        { id: "card", label: t("payCard"), value: mix.card, color: "bg-sky-500" },
      ]
    : [];

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden" data-testid="ops-hub-attention">
        <PanelHead icon={AlertTriangle} title={t("attentionTitle")} hint={t("attentionHint")} />
        {loading && !dashboard ? (
          <div className="space-y-2 p-4" aria-hidden>
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          </div>
        ) : attention.length === 0 ? (
          <div className="flex items-center gap-3 p-4 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            {t("attentionAllClear")}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {attention.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm touch-manipulation hover:bg-[var(--surface-muted)]/50"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      item.tone === "risk" ? "bg-red-500" : "bg-amber-500",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 font-medium text-[var(--text-primary)]">{item.text}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden" data-testid="ops-hub-top-services">
        <PanelHead icon={Scissors} title={t("topServices")} hint={t("periodLast30")} />
        {topServices.length === 0 ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{loading ? "…" : t("noServiceSales")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {topServices.map((s, index) => (
              <li key={s.serviceName} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{s.serviceName}</span>
                <span className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">{t("soldCount", { count: s.count })}</span>
                <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatCurrency(s.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden" data-testid="ops-hub-top-staff">
        <PanelHead icon={Users} title={t("topStylists")} hint={t("periodLast30")} />
        {topStaff.length === 0 ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{loading ? "…" : t("noStaffSales")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {topStaff.map((m, index) => (
              <li key={m.staffId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[var(--text-primary)]">{m.staffName}</span>
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">{m.branchName}</span>
                </span>
                <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatCurrency(m.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden" data-testid="ops-hub-payment-mix">
        <PanelHead icon={Wallet} title={t("paymentMix")} hint={t("periodLast30")} />
        {mixTotal <= 0 ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{loading ? "…" : t("noPayments")}</p>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
              {mixRows.map((r) => (
                <div key={r.id} className={r.color} style={{ width: `${(r.value / mixTotal) * 100}%` }} />
              ))}
            </div>
            <ul className="space-y-2.5">
              {mixRows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", r.color)} aria-hidden />
                  <span className="min-w-0 flex-1 font-medium text-[var(--text-primary)]">{r.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">
                    {Math.round((r.value / mixTotal) * 100)}%
                  </span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatCurrency(r.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden md:col-span-2" data-testid="ops-hub-recent-bookings">
        <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
          <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
            <ClipboardList className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="dashboard-overview-section-title">{t("recentBookings")}</h2>
            <p className="dashboard-overview-section-hint">{t("recentBookingsHint")}</p>
          </div>
          <Link href="/admin/bookings" className="shrink-0 text-xs font-semibold text-[var(--brand-text)] hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{loading ? "…" : t("noBookings")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {recentBookings.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-40 min-w-0 shrink-0">
                  <span className="block truncate font-medium text-[var(--text-primary)]">{b.customerName}</span>
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">{b.branchName}</span>
                </span>
                <span className="hidden min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)] sm:block">
                  {b.lines.map((l) => l.serviceName).join(", ") || "—"}
                </span>
                <span className="ml-auto shrink-0">
                  <StatusBadge status={b.status} />
                </span>
                <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
                  {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden md:col-span-2" data-testid="ops-hub-branches">
        <PanelHead icon={Building2} title={t("branchPerformance")} hint={t("periodLast30")} />
        {branches.length === 0 ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{loading ? "…" : t("noBranchData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]/40 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <th className="px-4 py-2.5">{t("colBranch")}</th>
                  <th className="px-3 py-2.5 text-right">{t("colVisits")}</th>
                  <th className="px-3 py-2.5 text-right">{t("colAvgTicket")}</th>
                  <th className="px-4 py-2.5 text-right">{t("colRevenue")}</th>
                  <th className="hidden w-40 px-4 py-2.5 lg:table-cell" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.branchId} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{b.branchName}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{b.visits}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">{formatCurrency(b.avgTicket)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(b.revenue)}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--brand)]"
                          style={{ width: `${Math.round((b.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
