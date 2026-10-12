"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AdvanceRecordsPanel } from "@/components/admin/requests/AdvanceRecordsPanel";
import { AlertBanner, Card, TablePagination, btnPrimary, inputClass } from "@/components/ui";
import { api, type AdvanceBudget, type AdvancePolicyInput, type EmployeeAdvanceSummary } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { monthStart, relativeDay } from "@/components/admin/requests/format";
import { TEAM_REQUEST_KEYS } from "@/components/admin/requests/use-team-requests";

export function BudgetPanel() {
  const t = useTranslations("admin.requests");
  const { data: budget, isLoading } = useQuery({ queryKey: TEAM_REQUEST_KEYS.budget, queryFn: () => api.getAdvanceBudget() });

  return (
    <div className="min-w-0 space-y-4">
      {isLoading ? <Card className="p-8 text-center text-sm text-[var(--text-secondary)]">{t("loading")}</Card> : null}
      {budget && !budget.policy.configured ? <AlertBanner variant="info">{t("budgetNotSet")}</AlertBanner> : null}
      {budget ? <BudgetOverview budget={budget} /> : null}
      {budget ? <PolicyForm key={policyKey(budget)} budget={budget} /> : null}
      {budget?.policy.configured ? <RecordAdvanceForm budget={budget} /> : null}
      {budget ? <AdvanceRecordsPanel budget={budget} /> : null}
      <EmployeeTable />
    </div>
  );
}

function BudgetOverview({ budget }: { budget: AdvanceBudget }) {
  const t = useTranslations("admin.requests");
  const tone = budget.utilizationPct >= 85 ? "bg-red-500" : budget.utilizationPct >= 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <Card className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("budgetTitle")}</h2>
          <p className="text-xs text-[var(--text-tertiary)]">{t("budgetHint")}</p>
        </div>
        <p className="text-xs tabular-nums text-[var(--text-secondary)]">{t("utilized", { percent: budget.utilizationPct })}</p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]" role="img" aria-label={t("utilized", { percent: budget.utilizationPct })}>
        <div className={cn("h-full rounded-full transition-[width]", tone)} style={{ width: `${budget.utilizationPct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("kpiBudget")} value={formatCurrency(budget.poolAmount)} />
        <Stat label={t("kpiOut")} value={formatCurrency(budget.outstanding)} />
        <Stat label={t("kpiAvailable")} value={formatCurrency(budget.available)} tone="good" />
        <Stat label={t("kpiWaiting")} value={formatCurrency(budget.pendingRequested)} hint={t("requestsCount", { count: budget.pendingCount })} tone={budget.pendingCount > 0 ? "warn" : undefined} />
        <Stat label={t("kpiPerEmployee")} value={formatCurrency(budget.perEmployeeCap)} hint={t("perEmployeeHint", { percent: budget.policy.maxPoolSharePercent })} />
        <Stat label={t("kpiDueThisMonth")} value={formatCurrency(budget.dueThisMonth)} />
      </div>
    </Card>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] p-3">
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
      <p className={cn("mt-1 truncate text-xl font-bold tabular-nums", tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-[var(--text-primary)]")}>{value}</p>
      {hint ? <p className="truncate text-[11px] text-[var(--text-secondary)]">{hint}</p> : null}
    </div>
  );
}

// Remount the form when the saved policy changes so the inputs re-seed from the server values.
function policyKey(b: AdvanceBudget) {
  const p = b.policy;
  return [p.poolAmount, p.maxPoolSharePercent, p.maxSalaryMultiple, p.maxInstallments, p.cooldownDays, p.enabled].join("|");
}

function PolicyForm({ budget }: { budget: AdvanceBudget }) {
  const t = useTranslations("admin.requests");
  const queryClient = useQueryClient();
  const p = budget.policy;
  const [form, setForm] = useState<AdvancePolicyInput>({
    poolAmount: p.poolAmount,
    maxPoolSharePercent: p.maxPoolSharePercent,
    maxSalaryMultiple: p.maxSalaryMultiple,
    maxInstallments: p.maxInstallments,
    cooldownDays: p.cooldownDays,
    enabled: p.enabled,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => api.updateAdvancePolicy(form),
    onSuccess: () => {
      setSaved(true);
      setError("");
      for (const key of Object.values(TEAM_REQUEST_KEYS)) void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });

  const perEmployee = useMemo(() => Math.floor((form.poolAmount * form.maxPoolSharePercent) / 100), [form.poolAmount, form.maxPoolSharePercent]);
  const set = <K extends keyof AdvancePolicyInput>(key: K, value: AdvancePolicyInput[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <Card className="min-w-0 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("rulesTitle")}</h2>
        <p className="text-xs text-[var(--text-tertiary)]">{t("rulesHint")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("fieldBudget")} hint={t("fieldBudgetHint")}>
          <input type="number" min={0} className={inputClass} value={form.poolAmount} onChange={(e) => set("poolAmount", Number(e.target.value))} />
        </Field>
        <Field label={t("fieldShare")} hint={t("fieldShareHint", { amount: formatCurrency(perEmployee) })}>
          <input type="number" min={1} max={100} className={inputClass} value={form.maxPoolSharePercent} onChange={(e) => set("maxPoolSharePercent", Number(e.target.value))} />
        </Field>
        <Field label={t("fieldSalaryMultiple")} hint={t("fieldSalaryMultipleHint")}>
          <input type="number" min={0.1} max={12} step={0.1} className={inputClass} value={form.maxSalaryMultiple} onChange={(e) => set("maxSalaryMultiple", Number(e.target.value))} />
        </Field>
        <Field label={t("fieldInstallments")} hint={t("fieldInstallmentsHint")}>
          <input type="number" min={1} max={24} className={inputClass} value={form.maxInstallments} onChange={(e) => set("maxInstallments", Number(e.target.value))} />
        </Field>
        <Field label={t("fieldCooldown")} hint={t("fieldCooldownHint")}>
          <input type="number" min={0} max={365} className={inputClass} value={form.cooldownDays} onChange={(e) => set("cooldownDays", Number(e.target.value))} />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          <span>
            <span className="block font-semibold text-[var(--text-primary)]">{t("fieldEnabled")}</span>
            <span className="block text-xs text-[var(--text-secondary)]">{t("fieldEnabledHint")}</span>
          </span>
        </label>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t("saving") : t("saveRules")}
        </button>
        {saved ? <span className="text-xs font-medium text-emerald-600">{t("saved")}</span> : null}
      </div>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
      {label}
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] font-normal text-[var(--text-tertiary)]">{hint}</span> : null}
    </label>
  );
}

function RecordAdvanceForm({ budget }: { budget: AdvanceBudget }) {
  const t = useTranslations("admin.requests");
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: TEAM_REQUEST_KEYS.employees,
    queryFn: () => api.getAdvanceEmployees({ page: 0, size: 500 }),
  });
  const employees = data?.content ?? [];
  const active = useMemo(() => employees.filter((e) => e.active), [employees]);

  const [staffId, setStaffId] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState(3);
  const [firstMonth, setFirstMonth] = useState(monthStart(1));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const selected = useMemo(() => active.find((e) => e.staffId === staffId), [active, staffId]);
  const maxGrant = useMemo(() => {
    if (!selected) return budget.available;
    return Math.max(0, Math.floor(Math.min(budget.available, selected.eligibleMax)));
  }, [budget.available, selected]);

  const amountNumber = Number(amount);
  const amountValid = Number.isFinite(amountNumber) && amountNumber >= 1;
  const canSubmit = !!staffId && amountValid && installments >= 1 && installments <= budget.policy.maxInstallments;

  const grant = useMutation({
    mutationFn: () =>
      api.grantAdvance({
        staffId,
        amount: amountNumber,
        installments,
        firstDeductionMonth: firstMonth,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      setSaved(true);
      setError("");
      setAmount("");
      setReason("");
      setNote("");
      for (const key of Object.values(TEAM_REQUEST_KEYS)) void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => {
      setSaved(false);
      setError(e instanceof Error ? e.message : t("actionFailed"));
    },
  });

  const perMonth = amountValid ? Math.floor((amountNumber / installments) * 100) / 100 : 0;

  return (
    <Card className="min-w-0 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("recordTitle")}</h2>
        <p className="text-xs text-[var(--text-tertiary)]">{t("recordHint")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("recordEmployee")}>
          <select
            className={inputClass}
            value={staffId}
            disabled={isLoading}
            onChange={(e) => {
              setStaffId(e.target.value);
              setSaved(false);
            }}
          >
            <option value="">{isLoading ? t("loading") : t("recordPickEmployee")}</option>
            {active.map((e: EmployeeAdvanceSummary) => (
              <option key={e.staffId} value={e.staffId}>
                {e.staffName} · {e.branchName ?? "—"}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("recordAmount")} hint={selected ? t("recordMaxHint", { amount: formatCurrency(maxGrant) }) : undefined}>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field label={t("installments")}>
          <select className={inputClass} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
            {Array.from({ length: budget.policy.maxInstallments }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {t("monthsOption", { count: n })}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("firstDeduction")}>
          <input type="month" className={inputClass} value={firstMonth.slice(0, 7)} onChange={(e) => setFirstMonth(`${e.target.value}-01`)} />
        </Field>
        <Field label={t("recordReason")} hint={t("recordReasonHint")}>
          <input className={inputClass} value={reason} maxLength={500} placeholder={t("recordReasonPlaceholder")} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label={t("notePlaceholder")}>
          <input className={inputClass} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {amountValid ? (
        <p className="text-xs text-[var(--text-secondary)]">{t("approvePreview", { each: formatCurrency(perMonth), count: installments })}</p>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={!canSubmit || grant.isPending} onClick={() => grant.mutate()}>
          {grant.isPending ? t("recordSaving") : t("recordSubmit")}
        </button>
        {saved ? <span className="text-xs font-medium text-emerald-600">{t("recordSaved")}</span> : null}
      </div>
    </Card>
  );
}

const EMPLOYEE_PAGE_SIZE = 20;

function EmployeeTable() {
  const t = useTranslations("admin.requests");
  const [onlyAsked, setOnlyAsked] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["team-requests", "employees", page, onlyAsked, search.trim()],
    queryFn: () =>
      api.getAdvanceEmployees({
        page,
        size: EMPLOYEE_PAGE_SIZE,
        onlyAsked: onlyAsked || undefined,
        search: search.trim() || undefined,
      }),
  });

  const rows = data?.content ?? [];

  return (
    <Card className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("historyTitle")}</h2>
          <p className="text-xs text-[var(--text-tertiary)]">{t("historyHint")}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              className="accent-[var(--brand)]"
              checked={onlyAsked}
              onChange={(e) => {
                setOnlyAsked(e.target.checked);
                setPage(0);
              }}
            />
            {t("onlyAsked")}
          </label>
          <input
            className={`${inputClass} !w-44 !py-1.5 text-xs`}
            placeholder={t("searchEmployee")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-3 py-2">{t("colEmployee")}</th>
              <th className="px-3 py-2 text-right">{t("colRequests")}</th>
              <th className="px-3 py-2 text-right">{t("colProRated")}</th>
              <th className="px-3 py-2 text-right">{t("colRequested")}</th>
              <th className="px-3 py-2 text-right">{t("colApproved")}</th>
              <th className="px-3 py-2">{t("colHolds")}</th>
              <th className="hidden px-3 py-2 xl:table-cell">{t("colLast")}</th>
              <th className="px-3 py-2 text-right">{t("colCanGet")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">{t("loading")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">{t("noEmployees")}</td></tr>
            ) : (
              rows.map((e) => (
                <tr key={e.staffId} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-[var(--text-primary)]">
                      {e.staffName}
                      {!e.active ? <span className="ml-2 rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("inactive")}</span> : null}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">{e.branchName}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {e.requestCount}
                    {e.repeatRequester ? (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" title={t("repeatNote", { count: e.requestsLast180Days })}>
                        {t("repeat")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]" title={t("colProRatedHint")}>
                    {e.proRatedSalary != null ? formatCurrency(e.proRatedSalary) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(e.totalRequested)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(e.totalApproved)}</td>
                  <td className="w-44 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div className={cn("h-full rounded-full", e.poolSharePct >= 20 ? "bg-amber-500" : "bg-[var(--brand)]")} style={{ width: `${Math.min(100, e.poolSharePct * 4)}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--text-secondary)]" title={t("poolShare", { percent: e.poolSharePct })}>
                        {formatCurrency(e.outstanding)}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-[var(--text-secondary)] xl:table-cell">{e.requestCount ? relativeDay(e.lastRequestedAt) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">{formatCurrency(e.eligibleMax)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.totalElements > 0 ? (
        <TablePagination
          page={page}
          size={EMPLOYEE_PAGE_SIZE}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
          onSizeChange={() => {}}
        />
      ) : null}
    </Card>
  );
}
