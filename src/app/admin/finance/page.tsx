"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  IndianRupee,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  api,
  CreateExpenditureRequest,
  ExpenditureCategory,
  ExpenditureItem,
  UpdateExpenditureRequest,
} from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import {
  MonthYearPicker,
  YearPicker,
  currentMonthIso,
  formatMonthYear,
  parseMonth,
  toMonthIso,
} from "@/components/MonthYearPicker";
import { FinanceTrends } from "@/components/FinanceTrends";
import {
  PageHeader,
  Card,
  StatCard,
  ListRow,
  EmptyState,
  AlertBanner,
  SideSheet,
  DetailField,
  SegmentedControl,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

type Tab = "overview" | "expenditures";
type ExpView = "months" | "detail";

const CATEGORIES: ExpenditureCategory[] = [
  "EMPLOYEE_SALARY",
  "RENT",
  "PRODUCT_COST",
  "EMPLOYEE_ACCOMMODATION_RENT",
  "MISCELLANEOUS",
];

const CATEGORY_STYLES: Record<ExpenditureCategory, string> = {
  EMPLOYEE_SALARY: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  RENT: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
  PRODUCT_COST: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  EMPLOYEE_ACCOMMODATION_RENT: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
  MISCELLANEOUS: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700",
};

type DrawerState =
  | { mode: "create"; branchId?: string; expenseMonth?: string }
  | { mode: "view" | "edit"; item: ExpenditureItem };

function monthToRange(monthIso: string) {
  const { year, month } = parseMonth(monthIso);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const todayEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    startDate: monthIso,
    endDate: isCurrentMonth ? todayEnd : endDate,
    fromMonth: monthIso,
    toMonth: monthIso,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function AdminFinancePage() {
  const t = useTranslations("admin.finance");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIso);
  const [tab, setTab] = useState<Tab>("overview");
  const [expView, setExpView] = useState<ExpView>("months");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [error, setError] = useState("");

  const range = monthToRange(selectedMonth);
  const selectedYear = parseMonth(selectedMonth).year;
  const { year: currentYear, month: currentMonthNum } = parseMonth(currentMonthIso());

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branchesLoading) return;
    if (!initialized) {
      if (branches.length > 0) setSelectedBranches(branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, branchesLoading, initialized]);

  const branchFilter =
    selectedBranches.length > 0 && selectedBranches.length < branches.length ? selectedBranches : undefined;

  const { data: pl, isLoading: plLoading } = useQuery({
    queryKey: ["pl-summary", selectedMonth, selectedBranches],
    queryFn: () =>
      api.getPlSummary({
        startDate: range.startDate,
        endDate: range.endDate,
        branchIds: branchFilter,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: plTrends, isLoading: plTrendsLoading } = useQuery({
    queryKey: ["pl-trends", selectedMonth, selectedBranches],
    queryFn: () =>
      api.getPlTrends({
        endMonth: selectedMonth,
        months: 6,
        branchIds: branchFilter,
      }),
    enabled: initialized && selectedBranches.length > 0 && tab === "overview",
  });

  const { data: yearExpenditures = [], isLoading: expLoading } = useQuery({
    queryKey: ["expenditures", selectedYear],
    queryFn: () =>
      api.getExpenditures({
        fromMonth: `${selectedYear}-01-01`,
        toMonth: `${selectedYear}-12-01`,
      }),
    enabled: initialized && tab === "expenditures",
  });

  const filteredYearExpenditures = useMemo(() => {
    if (!branchFilter) return yearExpenditures;
    const set = new Set(branchFilter);
    return yearExpenditures.filter((e) => set.has(e.branchId));
  }, [yearExpenditures, branchFilter]);

  const detailExpenditures = useMemo(
    () =>
      filteredYearExpenditures
        .filter((e) => e.expenseMonth === selectedMonth)
        .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)),
    [filteredYearExpenditures, selectedMonth]
  );

  const monthlySummaries = useMemo(() => {
    const lastMonth = selectedYear === currentYear ? currentMonthNum : 12;
    const summaries: {
      monthIso: string;
      label: string;
      total: number;
      lineCount: number;
      branchCount: number;
      isCurrent: boolean;
    }[] = [];

    for (let m = lastMonth; m >= 1; m--) {
      const monthIso = toMonthIso(selectedYear, m);
      const items = filteredYearExpenditures.filter((e) => e.expenseMonth === monthIso);
      const branchIds = new Set(items.map((i) => i.branchId));
      summaries.push({
        monthIso,
        label: formatMonthYear(monthIso),
        total: items.reduce((sum, i) => sum + i.amount, 0),
        lineCount: items.length,
        branchCount: branchIds.size,
        isCurrent: monthIso === currentMonthIso(),
      });
    }
    return summaries;
  }, [filteredYearExpenditures, selectedYear, currentYear, currentMonthNum]);

  const expendituresByBranch = useMemo(() => {
    return branches
      .filter((b) => selectedBranches.includes(b.id))
      .map((branch) => {
        const items = detailExpenditures.filter((e) => e.branchId === branch.id);
        const total = items.reduce((sum, i) => sum + i.amount, 0);
        return { branch, items, total };
      });
  }, [detailExpenditures, branches, selectedBranches]);

  const expenditureGrandTotal = detailExpenditures.reduce((sum, i) => sum + i.amount, 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["expenditures"] });
    queryClient.invalidateQueries({ queryKey: ["pl-summary"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenditureRequest) => api.createExpenditure(data),
    onSuccess: () => {
      invalidate();
      setDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenditureRequest }) =>
      api.updateExpenditure(id, data),
    onSuccess: () => {
      invalidate();
      setDrawer(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deactivateExpenditure(id),
    onSuccess: () => {
      invalidate();
      setDrawer(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.syncPayrollExpenditures(selectedMonth),
    onSuccess: () => invalidate(),
    onError: (e: Error) => setError(e.message),
  });

  const openMonthDetail = (monthIso: string) => {
    setSelectedMonth(monthIso);
    setExpView("detail");
  };

  if (!initialized || branchesLoading) {
    return <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">{t("loading")}</p>;
  }

  const brand = pl?.brand;
  const monthsWithDataCount = monthlySummaries.filter((m) => m.lineCount > 0).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={
          tab === "expenditures" && expView === "months"
            ? t("expenditureSummary", { year: selectedYear })
            : formatMonthYear(selectedMonth)
        }
        action={
          tab === "expenditures" && expView === "months" ? (
            <YearPicker
              value={selectedYear}
              onChange={(year) => setSelectedMonth(toMonthIso(year, parseMonth(selectedMonth).month))}
            />
          ) : (
            <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />
          )
        }
      />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      <SegmentedControl
        value={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "expenditures") setExpView("months");
        }}
        options={[
          { id: "overview", label: t("tabs.overview") },
          { id: "expenditures", label: t("tabs.expenditures") },
        ]}
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={t("selectBranchDesc")} />
      ) : tab === "overview" ? (
        plLoading || !pl ? (
          <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">{t("loadingPl")}</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t("revenue")} value={formatCurrency(brand!.revenue)} icon={TrendingUp} accent="emerald" />
              <StatCard label={t("totalExpenses")} value={formatCurrency(brand!.totalExpenses)} icon={TrendingDown} accent="amber" />
              <StatCard
                label={t("netPl")}
                value={formatCurrency(brand!.netProfit)}
                icon={IndianRupee}
                accent={brand!.netProfit >= 0 ? "emerald" : "amber"}
              />
              <StatCard label={t("margin")} value={`${brand!.marginPercent.toFixed(1)}%`} icon={IndianRupee} accent="violet" />
            </div>

            {plTrendsLoading ? (
              <p className="text-[var(--text-tertiary)] text-sm py-4 text-center">{t("loadingTrends")}</p>
            ) : plTrends && plTrends.branches.length > 0 ? (
              <FinanceTrends branches={plTrends.branches} periodLabel={plTrends.periodLabel} />
            ) : null}

            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)]">
                <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("brandRollup")}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {t("aggregatedBranches", { month: formatMonthYear(selectedMonth) })}
                </p>
              </div>
              <div className="p-4">
                {brand!.expensesByCategory.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">{t("noExpenditures")}</p>
                ) : (
                  <div className="space-y-2">
                    {brand!.expensesByCategory.map((c) => (
                      <div key={c.category} className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">{t(`categories.${c.category}`)}</span>
                        <span className="font-semibold">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)]">
                <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("branchPl")}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatMonthYear(selectedMonth)}</p>
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                      <th className="px-4 py-2 font-medium">{tCommon("branch")}</th>
                      <th className="px-4 py-2 font-medium">{t("revenue")}</th>
                      <th className="px-4 py-2 font-medium">{t("expenses")}</th>
                      <th className="px-4 py-2 font-medium">{t("netPl")}</th>
                      <th className="px-4 py-2 font-medium">{t("margin")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pl.branches.map((b) => (
                      <tr key={b.branchId} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2.5 font-medium">{b.branchName}</td>
                        <td className="px-4 py-2.5">{formatCurrency(b.revenue)}</td>
                        <td className="px-4 py-2.5">{formatCurrency(b.totalExpenses)}</td>
                        <td className={cn("px-4 py-2.5 font-semibold", b.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(b.netProfit)}
                        </td>
                        <td className="px-4 py-2.5">{b.marginPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-[var(--border)]">
                {pl.branches.map((b) => (
                  <ListRow
                    key={b.branchId}
                    title={b.branchName}
                    subtitle={t("revExp", { revenue: formatCurrency(b.revenue), expenses: formatCurrency(b.totalExpenses) })}
                    trailing={
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", b.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(b.netProfit)}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">{t("marginShort", { percent: b.marginPercent.toFixed(1) })}</p>
                      </div>
                    }
                  />
                ))}
              </div>
            </Card>
          </div>
        )
      ) : expView === "months" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("monthsHint")}
            </p>
            <button
              type="button"
              onClick={() => setDrawer({ mode: "create", expenseMonth: selectedMonth })}
              className={btnPrimary}
            >
              <Plus className="w-4 h-4" />
              {t("addExpenditure")}
            </button>
          </div>

          {expLoading ? (
            <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">{t("loadingExpenditures")}</p>
          ) : (
            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("yearMonths", { year: selectedYear })}</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {monthsWithDataCount === 1
                      ? tAdmin("monthsWithData", { count: monthsWithDataCount })
                      : tAdmin("monthsWithDataPlural", { count: monthsWithDataCount })}
                  </p>
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {formatCurrency(monthlySummaries.reduce((s, m) => s + m.total, 0))} {tAdmin("ytd")}
                </p>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {monthlySummaries.map((summary) => (
                  <button
                    key={summary.monthIso}
                    type="button"
                    onClick={() => openMonthDetail(summary.monthIso)}
                    className="w-full text-left hover:bg-[var(--surface-muted)]/60 transition"
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--text-primary)]">{summary.label}</p>
                          {summary.isCurrent && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-light)] text-[var(--brand-text)]">
                              {tAdmin("current")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {summary.lineCount === 0
                            ? tAdmin("noLineItems")
                            : `${summary.lineCount === 1 ? tAdmin("lineItems", { count: summary.lineCount }) : tAdmin("lineItemsPlural", { count: summary.lineCount })} · ${summary.branchCount === 1 ? tAdmin("branches", { count: summary.branchCount }) : tAdmin("branchesPlural", { count: summary.branchCount })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            summary.total > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                          )}
                        >
                          {summary.total > 0 ? formatCurrency(summary.total) : "—"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setExpView("months")}
              className={cn(btnSecondary, "text-sm")}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("allMonths")}
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDrawer({ mode: "create", expenseMonth: selectedMonth })}
                className={btnPrimary}
              >
                <Plus className="w-4 h-4" />
                {t("addForMonth", { month: formatMonthYear(selectedMonth) })}
              </button>
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className={btnSecondary}
              >
                <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
                {t("syncPayroll")}
              </button>
            </div>
          </div>

          <Card className="bg-[var(--surface-muted)]/40">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-[var(--text-primary)]">{formatMonthYear(selectedMonth)}</span>
              <span className="text-[var(--text-secondary)]">
                {detailExpenditures.length === 1
                  ? tAdmin("lineItems", { count: detailExpenditures.length })
                  : tAdmin("lineItemsPlural", { count: detailExpenditures.length })}{" "}
                ·{" "}
                <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(expenditureGrandTotal)}</span>
              </span>
            </div>
          </Card>

          {expLoading ? (
            <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">{t("loadingExpenditures")}</p>
          ) : (
            <div className="grid gap-4">
              {expendituresByBranch.map(({ branch, items, total }) => (
                <Card key={branch.id} padding={false}>
                  <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--brand-light)] flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-[var(--brand-text)]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{branch.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {items.length === 0
                            ? t("noExpendituresBranch", { month: formatMonthYear(selectedMonth) })
                            : items.length === 1
                              ? tAdmin("lineItems", { count: items.length })
                              : tAdmin("lineItemsPlural", { count: items.length })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {items.length > 0 && (
                        <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(total)}</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setDrawer({ mode: "create", branchId: branch.id, expenseMonth: selectedMonth })
                        }
                        className="text-xs font-semibold text-[var(--brand-text)] hover:underline px-2 py-1"
                      >
                        {t("addShort")}
                      </button>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {t("noLineItemsMonth", { month: formatMonthYear(selectedMonth) })}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setDrawer({ mode: "create", branchId: branch.id, expenseMonth: selectedMonth })
                        }
                        className={cn(btnSecondary, "mt-3 mx-auto")}
                      >
                        <Plus className="w-4 h-4" />
                        {t("addForBranch", { branch: branch.name })}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="divide-y divide-[var(--border)]">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDrawer({ mode: "view", item })}
                            className="w-full text-left hover:bg-[var(--surface-muted)]/60 transition"
                          >
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                    CATEGORY_STYLES[item.category]
                                  )}
                                >
                                  {t(`categories.${item.category}`)}
                                </span>
                                {item.description && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{item.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold tabular-nums">{formatCurrency(item.amount)}</span>
                                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-muted)]/40 flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">{t("branchSubtotal")}</span>
                        <span className="font-bold tabular-nums">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {drawer && (
        <ExpenditureDrawer
          drawer={drawer}
          branches={branches}
          onClose={() => setDrawer(null)}
          onEdit={(item) => setDrawer({ mode: "edit", item })}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          onDelete={(id) => deleteMutation.mutate(id)}
          saving={createMutation.isPending || updateMutation.isPending}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function ExpenditureDrawer({
  drawer,
  branches,
  onClose,
  onEdit,
  onCreate,
  onUpdate,
  onDelete,
  saving,
  deleting,
}: {
  drawer: DrawerState;
  branches: { id: string; name: string }[];
  onClose: () => void;
  onEdit: (item: ExpenditureItem) => void;
  onCreate: (data: CreateExpenditureRequest) => void;
  onUpdate: (id: string, data: UpdateExpenditureRequest) => void;
  onDelete: (id: string) => void;
  saving: boolean;
  deleting: boolean;
}) {
  const t = useTranslations("admin.finance");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("admin.inventory");
  const isCreate = drawer.mode === "create";
  const item = drawer.mode !== "create" ? drawer.item : null;
  const isView = drawer.mode === "view";

  const defaultMonth = currentMonthIso();
  const presetBranchId = drawer.mode === "create" ? drawer.branchId : undefined;
  const presetMonth = drawer.mode === "create" ? drawer.expenseMonth : undefined;

  const [branchId, setBranchId] = useState(item?.branchId ?? presetBranchId ?? branches[0]?.id ?? "");
  const [category, setCategory] = useState<ExpenditureCategory>(item?.category ?? "RENT");
  const [expenseMonth, setExpenseMonth] = useState(item?.expenseMonth ?? presetMonth ?? defaultMonth);
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [description, setDescription] = useState(item?.description ?? "");

  const monthInputValue = expenseMonth.slice(0, 7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!branchId || !expenseMonth || isNaN(parsed)) return;

    if (isCreate) {
      onCreate({ branchId, category, expenseMonth, amount: parsed, description: description || undefined });
    } else if (item) {
      onUpdate(item.id, {
        branchId,
        category,
        expenseMonth,
        amount: parsed,
        description: description || undefined,
      });
    }
  };

  if (isView && item) {
    return (
      <SideSheet
        open
        onClose={onClose}
        title={t(`categories.${item.category}`)}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => onEdit(item)} className={btnPrimary}>
              <Pencil className="w-4 h-4" />
              {tCommon("edit")}
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? tCommon("removing") : tCommon("remove")}
            </button>
          </div>
        }
      >
        <DetailField label={tCommon("branch")} value={item.branchName} />
        <DetailField label={tCategory("category")} value={t(`categories.${item.category}`)} />
        <DetailField label={tCommon("month")} value={formatMonthYear(item.expenseMonth)} />
        <DetailField label={tCommon("amount")} value={formatCurrency(item.amount)} />
        {item.description && <DetailField label={tCommon("description")} value={item.description} />}
      </SideSheet>
    );
  }

  return (
    <SideSheet
      open
      onClose={onClose}
      title={isCreate ? t("addExpenditureTitle") : t("editExpenditureTitle")}
      footer={
        <button type="submit" form="exp-form" disabled={saving} className={btnPrimary}>
          {saving ? tCommon("saving") : isCreate ? t("addExpenditureBtn") : tAdmin("saveChanges")}
        </button>
      }
    >
      <form id="exp-form" onSubmit={handleSubmit} className="space-y-4">
        {!isCreate && item && (
          <button type="button" onClick={() => onEdit(item)} className="text-xs link-brand">
            {t("backToDetailsLink")}
          </button>
        )}
        <Field label={tCommon("branch")}>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass} required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tCategory("category")}>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenditureCategory)} className={selectClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tCommon("month")}>
          <input
            type="month"
            value={monthInputValue}
            onChange={(e) => setExpenseMonth(`${e.target.value}-01`)}
            className={inputClass}
            required
          />
        </Field>
        <Field label={t("amountField")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label={t("descriptionOptional")}>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder={t("descriptionPlaceholder")}
          />
        </Field>
      </form>
    </SideSheet>
  );
}
