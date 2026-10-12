"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AlertBanner, Card, btnPrimary, btnSecondary } from "@/components/ui";
import { api, type AdvanceInstallment } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { monthLabel, monthStart } from "@/components/admin/requests/format";

export function DeductionsPanel() {
  const t = useTranslations("admin.requests");
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const month = monthStart(offset);

  const { data, isLoading } = useQuery({
    queryKey: ["team-requests", "deductions", month],
    queryFn: () => api.getAdvanceDeductions(month),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["team-requests"] });
  };
  const deductMonth = useMutation({ mutationFn: () => api.deductAdvanceMonth(month), onSuccess: refresh, onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")) });
  const deductOne = useMutation({ mutationFn: (id: string) => api.deductAdvanceInstallment(id), onSuccess: refresh, onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")) });
  const waiveOne = useMutation({ mutationFn: (id: string) => api.waiveAdvanceInstallment(id), onSuccess: refresh, onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")) });
  const busy = deductMonth.isPending || deductOne.isPending || waiveOne.isPending;

  return (
    <Card className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("deductionsTitle")}</h2>
          <p className="text-xs text-[var(--text-tertiary)]">{t("deductionsHint")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={`${btnSecondary} !p-2`} aria-label={t("prevMonth")} onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center text-sm font-semibold text-[var(--text-primary)]">{monthLabel(month)}</span>
          <button type="button" className={`${btnSecondary} !p-2`} aria-label={t("nextMonth")} onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("toDeduct")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-600">{formatCurrency(data?.totalDue ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("alreadyDeducted")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600">{formatCurrency(data?.totalDeducted ?? 0)}</p>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-3 py-2">{t("colEmployee")}</th>
              <th className="px-3 py-2 text-right">{t("colSalary")}</th>
              <th className="px-3 py-2 text-right">{t("colDeduct")}</th>
              <th className="px-3 py-2 text-right">{t("colNet")}</th>
              <th className="hidden px-3 py-2 xl:table-cell">{t("colAttendance")}</th>
              <th className="px-3 py-2 text-right">{t("colAction")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">{t("loading")}</td></tr>
            ) : (data?.rows.length ?? 0) === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">{t("nothingDue")}</td></tr>
            ) : (
              data?.rows.map((r) => (
                <tr key={r.staffId} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{r.staffName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{r.branchName}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.baseSalary != null ? formatCurrency(r.baseSalary) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className={cn("font-semibold", r.dueAmount > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {formatCurrency(r.dueAmount > 0 ? r.dueAmount : r.deductedAmount)}
                    </span>
                    {r.dueAmount === 0 && r.deductedAmount > 0 ? <span className="ml-1 text-[11px] text-emerald-600">{t("done")}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">{r.netAfterAdvances != null ? formatCurrency(r.netAfterAdvances) : "—"}</td>
                  <td className="hidden px-3 py-3 text-xs text-[var(--text-secondary)] xl:table-cell">
                    {t("attendanceLine", { present: r.daysPresent, leave: r.approvedLeaveDays })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {r.installments.filter((i) => i.status === "SCHEDULED").map((i: AdvanceInstallment) => (
                        <span key={i.id} className="inline-flex gap-1">
                          <button type="button" className={`${btnSecondary} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => deductOne.mutate(i.id)}>
                            {t("markDeducted")}
                          </button>
                          <button type="button" className={`${btnSecondary} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => waiveOne.mutate(i.id)}>
                            {t("waive")}
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-[11px] text-[var(--text-tertiary)]">{t("netNote")}</p>
        <button type="button" className={btnPrimary} disabled={busy || (data?.totalDue ?? 0) <= 0} onClick={() => deductMonth.mutate()}>
          {t("markAllDeducted")}
        </button>
      </div>
    </Card>
  );
}
