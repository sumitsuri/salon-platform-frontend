"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeftRight, Boxes, CheckCircle2, ChevronRight, IndianRupee, Layers, Package, Receipt, Trophy } from "lucide-react";
import { api, type MovementType } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDateRangeLabel, todayIsoDate } from "@/lib/date-range";
import { currentMonthIso } from "@/components/MonthYearPicker";
import { CompactStatsStrip, type CompactStatItem } from "@/components/CompactStatsStrip";

function PanelHead({ icon: Icon, title, hint, href, cta }: { icon: typeof Package; title: string; hint?: string; href: string; cta: string }) {
  return (
    <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
      <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="dashboard-overview-section-title">{title}</h2>
        {hint ? <p className="dashboard-overview-section-hint">{hint}</p> : null}
      </div>
      <Link href={href} className="shrink-0 text-xs font-semibold text-[var(--brand-text)] hover:underline">
        {cta}
      </Link>
    </div>
  );
}

/** Tablet/desktop snapshot for the Stock hub: stock health, recent movements and this month's spend. */
export function StockHubOverview() {
  const t = useTranslations("manager.stockHub");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId ?? "";
  const monthIso = currentMonthIso();
  const monthStart = `${monthIso.slice(0, 7)}-01`;
  const todayIso = todayIsoDate();

  const { data: stock = [], isLoading: stockLoading } = useQuery({
    queryKey: ["inventory-stock", branchId],
    queryFn: () => api.getInventoryStock(branchId),
    enabled: !!branchId,
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["inventory-movements", branchId, monthStart, todayIso],
    queryFn: () => api.getInventoryMovements({ branchId, fromDate: monthStart, toDate: todayIso }),
    enabled: !!branchId,
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenditures", branchId, monthIso.slice(0, 7)],
    queryFn: () => api.getExpenditures({ branchId, fromMonth: monthIso, toMonth: monthIso }),
    enabled: !!branchId,
  });

  const needsRestock = useMemo(
    () => stock.filter((s) => s.lowStock || s.outOfStock).sort((a, b) => Number(b.outOfStock) - Number(a.outOfStock)),
    [stock],
  );
  const stockValue = useMemo(() => stock.reduce((sum, s) => sum + (s.stockValue ?? 0), 0), [stock]);
  const monthSpend = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const byCategory = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const s of stock) {
      const row = map.get(s.category) ?? { count: 0, value: 0 };
      row.count += 1;
      row.value += s.stockValue ?? 0;
      map.set(s.category, row);
    }
    return [...map.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.value - a.value);
  }, [stock]);
  const maxCategoryValue = Math.max(1, ...byCategory.map((c) => c.value));
  const topByValue = useMemo(() => [...stock].sort((a, b) => (b.stockValue ?? 0) - (a.stockValue ?? 0)).slice(0, 5), [stock]);
  const recentMovements = useMemo(
    () => [...movements].sort((a, b) => b.movementDate.localeCompare(a.movementDate)).slice(0, 6),
    [movements],
  );
  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5),
    [expenses],
  );

  const kpis: CompactStatItem[] = [
    { id: "products", label: t("kpiProducts"), value: String(stock.length), icon: Boxes, accent: "violet", href: "/manager/inventory" },
    {
      id: "restock",
      label: t("kpiRestock"),
      value: String(needsRestock.length),
      icon: AlertTriangle,
      accent: needsRestock.length > 0 ? "amber" : "emerald",
      href: "/manager/inventory",
    },
    { id: "value", label: t("kpiStockValue"), value: formatCurrency(stockValue), icon: Package, accent: "sky", href: "/manager/inventory" },
    { id: "spend", label: t("kpiMonthSpend"), value: formatCurrency(monthSpend), icon: IndianRupee, accent: "rose", href: "/manager/expenditure" },
  ];

  const typeLabel = (type: MovementType) => t(`move${type}` as "moveRESTOCK");

  return (
    <div className="min-w-0 space-y-4">
      <CompactStatsStrip items={kpis} loading={stockLoading && stock.length === 0} testId="stock-hub-kpis" />

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden">
          <PanelHead icon={AlertTriangle} title={t("restockTitle")} hint={t("restockHint")} href="/manager/inventory" cta={t("viewAll")} />
          {needsRestock.length === 0 ? (
            <div className="flex items-center gap-3 p-4 text-sm text-[var(--text-secondary)]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              {t("restockAllGood")}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {needsRestock.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link
                    href="/manager/inventory"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm touch-manipulation hover:bg-[var(--surface-muted)]/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{s.productName}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">
                      {s.quantity}
                      {s.reorderLevel != null ? ` / ${s.reorderLevel}` : ""}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        s.outOfStock ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {s.outOfStock ? t("badgeOut") : t("badgeLow")}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden">
          <PanelHead icon={ArrowLeftRight} title={t("movementsTitle")} hint={t("thisMonth")} href="/manager/inventory" cta={t("viewAll")} />
          {recentMovements.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-secondary)]">{t("movementsEmpty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentMovements.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="shrink-0 rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--brand-text)]">
                    {typeLabel(m.movementType)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{m.productName}</span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">×{m.quantity}</span>
                  <span className="w-24 shrink-0 text-right text-xs text-[var(--text-tertiary)]">
                    {formatDateRangeLabel(m.movementDate.slice(0, 10), m.movementDate.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden">
          <PanelHead icon={Layers} title={t("categoryTitle")} hint={t("categoryHint")} href="/manager/inventory" cta={t("viewAll")} />
          {byCategory.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-secondary)]">{t("categoryEmpty")}</p>
          ) : (
            <ul className="space-y-3 p-4">
              {byCategory.map((c) => (
                <li key={c.category} className="text-sm">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-medium text-[var(--text-primary)]">
                      {t(`category${c.category}` as "categoryCONSUMABLE")}
                      <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)]">{t("itemCount", { count: c.count })}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(c.value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.round((c.value / maxCategoryValue) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden">
          <PanelHead icon={Trophy} title={t("topValueTitle")} hint={t("topValueHint")} href="/manager/inventory" cta={t("viewAll")} />
          {topByValue.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-secondary)]">{t("categoryEmpty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {topByValue.map((s, index) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{s.productName}</span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">{s.quantity}</span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatCurrency(s.stockValue ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden md:col-span-2">
          <PanelHead icon={Receipt} title={t("expensesTitle")} hint={t("thisMonth")} href="/manager/expenditure" cta={t("viewAll")} />
          {recentExpenses.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-secondary)]">{t("expensesEmpty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentExpenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                    {e.description || t("expenseDefault")}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                    {e.createdAt ? formatDateRangeLabel(e.createdAt.slice(0, 10), e.createdAt.slice(0, 10)) : ""}
                  </span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatCurrency(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
