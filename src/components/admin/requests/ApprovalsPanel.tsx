"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, Wallet } from "lucide-react";
import { AlertBanner, Card, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { api, type AdvanceBudget, type AdvanceRequest, type LeaveRecord } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { dayLabel, monthLabel, monthStart } from "@/components/admin/requests/format";
import { TEAM_REQUEST_KEYS, useTeamRequests } from "@/components/admin/requests/use-team-requests";

export function ApprovalsPanel() {
  const t = useTranslations("admin.requests");
  const { budget, pendingAdvances, pendingLeaves, loading, error } = useTeamRequests();
  const empty = !loading && pendingAdvances.length === 0 && pendingLeaves.length === 0;

  return (
    <div className="min-w-0 space-y-4">
      {error instanceof Error ? <AlertBanner variant="error">{error.message}</AlertBanner> : null}
      {loading ? <Card className="p-8 text-center text-sm text-[var(--text-secondary)]">{t("loading")}</Card> : null}
      {empty ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t("allCaughtUp")}</p>
          <p className="text-xs text-[var(--text-secondary)]">{t("allCaughtUpHint")}</p>
        </Card>
      ) : null}

      {pendingAdvances.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle icon={Wallet} title={t("advanceRequests")} count={pendingAdvances.length} />
          {budget && !budget.policy.configured ? <AlertBanner variant="warning">{t("budgetNotSet")}</AlertBanner> : null}
          <div className="grid gap-3 hub:grid-cols-2">
            {pendingAdvances.map((a) => (
              <AdvanceCard key={a.id} advance={a} budget={budget} />
            ))}
          </div>
        </section>
      ) : null}

      {pendingLeaves.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle icon={CalendarDays} title={t("leaveRequests")} count={pendingLeaves.length} />
          <div className="grid gap-3 hub:grid-cols-2">
            {pendingLeaves.map((l) => (
              <LeaveCard key={l.id} leave={l} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }: { icon: typeof Wallet; title: string; count: number }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
      <Icon className="h-4 w-4 text-[var(--brand-text)]" aria-hidden />
      {title}
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">{count}</span>
    </h2>
  );
}

// ------------------------------------------------------------------------------------------ advance

function AdvanceCard({ advance, budget }: { advance: AdvanceRequest; budget?: AdvanceBudget }) {
  const t = useTranslations("admin.requests");
  const queryClient = useQueryClient();
  const history = advance.requesterHistory;

  // The most this request can be granted right now: bounded by what was asked, what is left in the budget, and
  // what this employee may still hold. The server re-checks all of it at approval.
  const maxGrant = useMemo(() => {
    const limits = [advance.requestedAmount];
    if (budget) limits.push(budget.available);
    if (history) limits.push(history.eligibleMax);
    return Math.max(0, Math.floor(Math.min(...limits)));
  }, [advance.requestedAmount, budget, history]);

  const [amount, setAmount] = useState(String(maxGrant > 0 ? maxGrant : advance.requestedAmount));
  const [installments, setInstallments] = useState(advance.requestedInstallments);
  const [firstMonth, setFirstMonth] = useState(monthStart(1));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const refresh = () => {
    for (const key of Object.values(TEAM_REQUEST_KEYS)) void queryClient.invalidateQueries({ queryKey: key });
  };
  const approve = useMutation({
    mutationFn: () =>
      api.approveAdvance(advance.id, {
        approvedAmount: Number(amount),
        installments,
        firstDeductionMonth: firstMonth,
        note: note.trim() || undefined,
      }),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });
  const reject = useMutation({
    mutationFn: () => api.rejectAdvance(advance.id, note.trim() || undefined),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });

  const amountNumber = Number(amount);
  const amountValid = Number.isFinite(amountNumber) && amountNumber >= 1 && amountNumber <= advance.requestedAmount;
  const exceedsBudget = !!budget && amountValid && amountNumber > budget.available;
  const remainingAfter = budget && amountValid ? budget.available - amountNumber : null;
  const perMonth = amountValid ? Math.floor((amountNumber / installments) * 100) / 100 : 0;
  const busy = approve.isPending || reject.isPending;

  return (
    <Card className="min-w-0 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{advance.staffName}</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {advance.branchName} · {t("requestedOn", { date: dayLabel(advance.createdAt) })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{formatCurrency(advance.requestedAmount)}</p>
          <p className="text-[11px] text-[var(--text-secondary)]">{t("overMonths", { count: advance.requestedInstallments })}</p>
        </div>
      </div>

      {advance.reason ? <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)]">{advance.reason}</p> : null}

      {history ? (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--border)] p-2.5 text-center">
          <Fact label={t("histRequests")} value={String(history.requestCount)} tone={history.repeatRequester ? "warn" : undefined} />
          <Fact label={t("histApproved")} value={formatCurrency(history.totalApproved)} />
          <Fact label={t("histOutstanding")} value={formatCurrency(history.outstanding)} tone={history.poolSharePct >= 20 ? "warn" : undefined} />
          {history.repeatRequester ? (
            <p className="col-span-3 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              {t("repeatNote", { count: history.requestsLast180Days })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            {t("approveAmount")}
            <input type="number" min={1} max={advance.requestedAmount} className={`${inputClass} mt-1`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            {t("installments")}
            <select className={`${inputClass} mt-1`} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
              {Array.from({ length: budget?.policy.maxInstallments ?? 6 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {t("monthsOption", { count: n })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          {t("firstDeduction")}
          <select className={`${inputClass} mt-1`} value={firstMonth} onChange={(e) => setFirstMonth(e.target.value)}>
            {[0, 1, 2, 3].map((o) => (
              <option key={o} value={monthStart(o)}>
                {monthLabel(monthStart(o))}
              </option>
            ))}
          </select>
        </label>
        <input className={inputClass} placeholder={t("notePlaceholder")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />

        {amountValid ? (
          <p className={cn("text-xs font-medium", exceedsBudget ? "text-red-600" : "text-[var(--text-secondary)]")}>
            {t("approvePreview", { each: formatCurrency(perMonth), count: installments })}
            {remainingAfter != null
              ? exceedsBudget
                ? ` ${t("overBudget", { left: formatCurrency(budget?.available ?? 0) })}`
                : ` ${t("budgetAfter", { left: formatCurrency(remainingAfter) })}`
              : ""}
          </p>
        ) : null}
        {maxGrant < advance.requestedAmount ? (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">{t("capNote", { amount: formatCurrency(maxGrant) })}</p>
        ) : null}
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="flex gap-2">
          <button
            type="button"
            className={`${btnPrimary} flex-1`}
            disabled={busy || !amountValid || exceedsBudget}
            onClick={() => {
              setError("");
              approve.mutate();
            }}
          >
            {t("approve")}
          </button>
          <button
            type="button"
            className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}
            disabled={busy}
            onClick={() => {
              setError("");
              reject.mutate();
            }}
          >
            {t("reject")}
          </button>
        </div>
      </div>
    </Card>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="min-w-0">
      <p className={cn("truncate text-sm font-bold tabular-nums", tone === "warn" ? "text-amber-600" : "text-[var(--text-primary)]")}>{value}</p>
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ leave

function LeaveCard({ leave }: { leave: LeaveRecord }) {
  const t = useTranslations("admin.requests");
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const refresh = () => void queryClient.invalidateQueries({ queryKey: TEAM_REQUEST_KEYS.pendingLeaves });
  const approve = useMutation({
    mutationFn: () => api.approveLeave(leave.id, note.trim() || undefined),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });
  const reject = useMutation({
    mutationFn: () => api.rejectLeave(leave.id, note.trim() || undefined),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });
  const busy = approve.isPending || reject.isPending;
  const sameDay = leave.startDate === leave.endDate;

  return (
    <Card className="min-w-0 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{leave.staffName}</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {leave.branchName} · {t("requestedOn", { date: dayLabel(leave.createdAt) })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {sameDay ? dayLabel(leave.startDate) : `${dayLabel(leave.startDate)} → ${dayLabel(leave.endDate)}`}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {t("leaveDays", { count: leave.days ?? 1 })}
            {leave.leaveType === "HALF_DAY" ? ` · ${t("halfDay")}` : ""}
          </p>
        </div>
      </div>
      {leave.reason ? <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)]">{leave.reason}</p> : null}
      {leave.staffApprovedDaysThisYear != null ? (
        <p className="text-xs text-[var(--text-secondary)]">{t("leaveThisYear", { count: leave.staffApprovedDaysThisYear })}</p>
      ) : null}
      <input className={inputClass} placeholder={t("notePlaceholder")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="flex gap-2">
        <button type="button" className={`${btnPrimary} flex-1`} disabled={busy} onClick={() => { setError(""); approve.mutate(); }}>
          {t("approve")}
        </button>
        <button
          type="button"
          className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}
          disabled={busy}
          onClick={() => { setError(""); reject.mutate(); }}
        >
          {t("reject")}
        </button>
      </div>
    </Card>
  );
}
