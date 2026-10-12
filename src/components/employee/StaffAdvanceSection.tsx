"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertBanner, Card, StatusBadge, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { DashboardWidgetCard } from "@/components/enterprise-ui";
import { api, type AdvanceInstallment, type AdvanceRequest } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

function monthLabel(iso?: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function dayLabel(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function StaffAdvanceSection() {
  const t = useTranslations("employee.advance");
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState(3);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-portal-advances"],
    queryFn: () => api.getMyAdvances(),
  });

  const eligibility = data?.eligibility;
  const maxInstallments = eligibility?.maxInstallments ?? 6;
  const amountNumber = Number(amount);
  const amountValid = Number.isFinite(amountNumber) && amountNumber >= 1 && amountNumber <= (eligibility?.maxAmount ?? 0);
  const perMonth = useMemo(
    () => (amountValid ? Math.floor((amountNumber / installments) * 100) / 100 : 0),
    [amountValid, amountNumber, installments],
  );

  const submit = useMutation({
    mutationFn: () => api.requestAdvance({ amount: amountNumber, installments, reason: reason.trim() }),
    onSuccess: () => {
      setAmount("");
      setReason("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["staff-portal-advances"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("requestFailed")),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelMyAdvance(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["staff-portal-advances"] }),
    onError: (e) => setError(e instanceof Error ? e.message : t("requestFailed")),
  });

  const canRequest = eligibility?.canRequest === true;

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label={t("youOwe")} value={formatCurrency(data?.outstanding ?? 0)} accent="amber" loading={isLoading} />
        <SummaryTile
          label={t("nextDeduction")}
          value={data?.nextInstallment ? formatCurrency(data.nextInstallment.amount) : "—"}
          hint={data?.nextInstallment ? t("fromSalaryOf", { month: monthLabel(data.nextInstallment.dueMonth) }) : t("nothingDue")}
          accent="violet"
          loading={isLoading}
        />
        <SummaryTile
          label={t("yourHistory")}
          value={String(data?.requestCount ?? 0)}
          hint={t("approvedTotal", { amount: formatCurrency(data?.totalApproved ?? 0) })}
          accent="sky"
          loading={isLoading}
        />
      </div>

      <DashboardWidgetCard>
        <div className="space-y-3 p-3 sm:p-4">
          {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

          {canRequest ? (
            <>
              <div>
                <h2 className="dashboard-widget-title">{t("requestTitle")}</h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{t("requestSubtitle")}</p>
              </div>
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                {t("amount")}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={eligibility?.maxAmount ?? undefined}
                  className={`${inputClass} mt-1`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
                <span className="mt-1 block text-[11px] font-normal text-[var(--text-tertiary)]">
                  {t("maxHint", { amount: formatCurrency(eligibility?.maxAmount ?? 0) })}
                </span>
              </label>

              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">{t("repayOver")}</p>
                <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("repayOver")}>
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={installments === n}
                      onClick={() => setInstallments(n)}
                      className={cn(
                        "min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-semibold transition touch-manipulation",
                        installments === n
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                      )}
                    >
                      {t("monthsShort", { count: n })}
                    </button>
                  ))}
                </div>
                {amountValid ? (
                  <p className="mt-2 rounded-lg bg-[var(--brand-light)]/60 px-3 py-2 text-xs font-medium text-[var(--brand-text)]">
                    {t("preview", {
                      amount: formatCurrency(perMonth),
                      count: installments,
                      month: monthLabel(eligibility?.firstDeductionMonth),
                    })}
                  </p>
                ) : null}
              </div>

              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                {t("reason")}
                <textarea
                  className={`${inputClass} mt-1 min-h-[72px] w-full`}
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                />
              </label>

              <button
                type="button"
                className={btnPrimary}
                disabled={submit.isPending || !amountValid || !reason.trim()}
                onClick={() => {
                  setError("");
                  submit.mutate();
                }}
              >
                {submit.isPending ? t("submitting") : t("submit")}
              </button>
              <p className="text-[11px] text-[var(--text-tertiary)]">{t("approvalHint")}</p>
            </div>
            </>
          ) : null}

          <div>
            <p className="section-label mb-2">{t("history")}</p>
            <Card className="divide-y divide-[var(--border)] overflow-hidden p-0">
              {isLoading ? <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loading")}</p> : null}
              {!isLoading && (data?.advances.length ?? 0) === 0 ? (
                <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
              ) : null}
              {!isLoading && (data?.advances.some((a) => a.recordedOnBehalf) ?? false) ? (
                <p className="border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-4 py-2.5 text-xs text-[var(--text-secondary)]">
                  {t("onBehalfHint")}
                </p>
              ) : null}
              {data?.advances.map((a) => (
                <AdvanceRow key={a.id} advance={a} onCancel={() => cancel.mutate(a.id)} cancelling={cancel.isPending} />
              ))}
            </Card>
          </div>
        </div>
      </DashboardWidgetCard>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: "amber" | "violet" | "sky";
  loading?: boolean;
}) {
  const tone = {
    amber: "border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20",
    violet: "border-violet-200/80 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20",
    sky: "border-sky-200/80 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/20",
  }[accent];
  return (
    <div className={cn("min-w-0 rounded-2xl border p-3.5", tone)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold leading-none tabular-nums text-[var(--text-primary)]", loading && "opacity-40")}>{value}</p>
      {hint ? <p className="mt-1.5 truncate text-[11px] text-[var(--text-secondary)]">{hint}</p> : null}
    </div>
  );
}

function AdvanceRow({ advance, onCancel, cancelling }: { advance: AdvanceRequest; onCancel: () => void; cancelling: boolean }) {
  const t = useTranslations("employee.advance");
  const granted = advance.approvedAmount ?? null;
  const onBehalf = advance.recordedOnBehalf === true;
  const dateLine = onBehalf
    ? t("recordedOnBehalf", {
        date: dayLabel(advance.decidedAt ?? advance.createdAt),
        name: advance.decidedByName?.trim() || t("yourManager"),
      })
    : t("requestedOn", { date: dayLabel(advance.createdAt) });
  return (
    <div className="space-y-2 px-4 py-3">
      {onBehalf ? (
        <p className="rounded-lg border border-violet-200/80 bg-violet-50/70 px-3 py-2 text-xs font-medium text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
          {t("onBehalfBadge")}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(onBehalf ? (granted ?? advance.requestedAmount) : advance.requestedAmount)}
            <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
              {t("overMonths", { count: advance.approvedInstallments ?? advance.requestedInstallments })}
            </span>
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">{dateLine}</p>
        </div>
        <StatusBadge status={advance.status} />
      </div>

      {advance.reason ? <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{advance.reason}</p> : null}

      {granted != null && granted !== advance.requestedAmount ? (
        <p className="text-xs font-medium text-[var(--brand-text)]">
          {t("grantedLess", { amount: formatCurrency(granted), count: advance.approvedInstallments ?? 1 })}
        </p>
      ) : null}

      {advance.decisionNote ? (
        <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{t("ownerNote")}</span> {advance.decisionNote}
        </p>
      ) : null}

      {advance.installments.length > 0 ? (
        <details className="group text-xs">
          <summary className="cursor-pointer select-none font-semibold text-[var(--brand-text)]">
            {t("schedule")} · {t("repaidOf", { settled: formatCurrency(advance.settled), total: formatCurrency(advance.approvedAmount ?? 0) })}
          </summary>
          <ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {advance.installments.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className="text-[var(--text-secondary)]">{monthLabel(i.dueMonth)}</span>
                <span className="tabular-nums font-medium text-[var(--text-primary)]">{formatCurrency(i.amount)}</span>
                <InstallmentChip installment={i} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {advance.status === "PENDING" ? (
        <button type="button" className={`${btnSecondary} !py-1.5 text-xs`} disabled={cancelling} onClick={onCancel}>
          {t("cancelRequest")}
        </button>
      ) : null}
    </div>
  );
}

function InstallmentChip({ installment }: { installment: AdvanceInstallment }) {
  const t = useTranslations("employee.advance");
  const tone =
    installment.status === "DEDUCTED"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : installment.status === "WAIVED"
        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone)}>
      {t(`installment.${installment.status}` as "installment.SCHEDULED")}
    </span>
  );
}
