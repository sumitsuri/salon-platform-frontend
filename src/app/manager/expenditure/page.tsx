"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus, Receipt } from "lucide-react";
import {
  api,
  CreateExpenditureRequest,
  ExpenditureCategory,
  ExpenditureItem,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
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
  selectClass,
  btnPrimary,
  DetailField,
} from "@/components/ui";

const CATEGORIES: ExpenditureCategory[] = [
  "RENT",
  "EMPLOYEE_SALARY",
  "PRODUCT_COST",
  "EMPLOYEE_ACCOMMODATION_RENT",
  "MISCELLANEOUS",
];

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
  const tInv = useTranslations("admin.inventory");
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

  const [category, setCategory] = useState<ExpenditureCategory>("MISCELLANEOUS");
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

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.amount - a.amount),
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
    setCategory("MISCELLANEOUS");
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
      category,
      expenseMonth: currentMonthIso(),
      amount: parsed,
      description: description || undefined,
    });
  }

  const monthLabel = formatMonthYear(monthIso);

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-4">
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
                title={tFinance(`categories.${item.category}`)}
                subtitle={item.description || monthLabel}
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
          <Field label={tInv("category")}>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenditureCategory)} className={selectClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tFinance(`categories.${c}`)}
                </option>
              ))}
            </select>
          </Field>
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
