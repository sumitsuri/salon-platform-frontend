"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Hash, IndianRupee, Plus, Receipt, TrendingUp, Calculator } from "lucide-react";
import { api, CreateExpenditureRequest, ExpenditureItem } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { CompactStatsStrip, type CompactStatItem } from "@/components/CompactStatsStrip";
import { currentMonthIso, formatMonthYear } from "@/components/MonthYearPicker";
import { todayIsoDate, formatDateRangeLabel } from "@/lib/date-range";
import {
  PageHeader,
  Card,
  ListRow,
  EmptyState,
  AlertBanner,
  SideSheet,
  inputClass,
  btnPrimary,
  DetailField,
} from "@/components/ui";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

export default function ManagerExpenditurePage() {
  const t = useTranslations("manager.expenditure");
  const tFinance = useTranslations("admin.finance");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const branchId = user?.branchId ?? "";

  const monthIso = currentMonthIso();
  const todayIso = todayIsoDate();
  const todayLabel = formatDateRangeLabel(todayIso, todayIso);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (params.get("add") === "1") setDrawerOpen(true);
  }, [params]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["expenditures", branchId, monthIso.slice(0, 7)],
    queryFn: () =>
      api.getExpenditures({
        branchId,
        fromMonth: monthIso,
        toMonth: monthIso,
      }),
    enabled: !!branchId,
  });

  const wide = useMediaQuery("(min-width: 768px)");
  const kpis = useMemo<CompactStatItem[]>(() => {
    const total = items.reduce((sum, e) => sum + e.amount, 0);
    const largest = items.reduce((max, e) => Math.max(max, e.amount), 0);
    return [
      { id: "total", label: t("kpiTotal"), value: formatCurrency(total), icon: IndianRupee, accent: "rose" },
      { id: "entries", label: t("kpiEntries"), value: String(items.length), icon: Hash, accent: "violet" },
      { id: "avg", label: t("kpiAverage"), value: formatCurrency(items.length ? total / items.length : 0), icon: Calculator, accent: "sky" },
      { id: "largest", label: t("kpiLargest"), value: formatCurrency(largest), icon: TrendingUp, accent: "amber" },
    ];
  }, [items, t]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      }),
    [items],
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenditureRequest) => api.createExpenditure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      setDrawerOpen(false);
      setAmount("");
      setDescription("");
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  function openCreate() {
    setAmount("");
    setDescription("");
    setError("");
    setDrawerOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!branchId || Number.isNaN(parsed)) return;
    createMutation.mutate({
      branchId,
      category: "MISCELLANEOUS",
      expenseMonth: currentMonthIso(),
      amount: parsed,
      description: description || undefined,
    });
  }

  const monthLabel = formatMonthYear(monthIso);

  return (
    <div className="mx-auto w-full min-w-0 space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { month: monthLabel, branch: user?.branchName ?? "" })}
        action={
          <button type="button" onClick={openCreate} className={`${btnPrimary} min-h-11`}>
            <Plus className="h-4 w-4" />
            {tFinance("addExpenditure")}
          </button>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {wide ? <CompactStatsStrip items={kpis} loading={isLoading && items.length === 0} testId="expenditure-kpis" /> : null}

      <Card padding={false}>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">{t("thisMonth")}</p>
          <p className="text-xs text-[var(--text-secondary)]">{t("thisMonthHint")}</p>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("emptyTitle")}
            description={t("emptyDesc")}
            action={
              <button type="button" onClick={openCreate} className={btnPrimary}>
                {tFinance("addExpenditure")}
              </button>
            }
          />
        ) : (
          <div>
            {sorted.map((item: ExpenditureItem) => (
              <ListRow
                key={item.id}
                title={item.description || t("dailyExpenseDefaultTitle")}
                subtitle={formatDateRangeLabel(item.createdAt?.slice(0, 10) ?? todayIso, item.createdAt?.slice(0, 10) ?? todayIso)}
                trailing={
                  <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(item.amount)}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <SideSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={tFinance("addExpenditureTitle")}
        footer={
          <button type="submit" form="manager-expenditure-form" className={`${btnPrimary} w-full min-h-11`} disabled={createMutation.isPending}>
            {createMutation.isPending ? tCommon("saving") : tFinance("addExpenditureBtn")}
          </button>
        }
      >
        <form id="manager-expenditure-form" onSubmit={handleSubmit} className="space-y-4">
          <DetailField label={t("recordedOn")} value={todayLabel} />
          <p className="text-xs text-[var(--text-secondary)]">{t("recordedOnHint", { month: monthLabel })}</p>
          <Field label={tCommon("amount")}>
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} required />
          </Field>
          <Field label={tCommon("description")}>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder={t("descriptionPlaceholder")} />
          </Field>
        </form>
      </SideSheet>
    </div>
  );
}
