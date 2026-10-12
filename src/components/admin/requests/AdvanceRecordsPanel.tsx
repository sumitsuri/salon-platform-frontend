"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { AlertBanner, Card, StatusBadge, TablePagination, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { api, type AdvanceBudget, type AdvanceRequest, type UpdateAdvanceInput } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { dayLabel, monthStart } from "@/components/admin/requests/format";
import { TEAM_REQUEST_KEYS } from "@/components/admin/requests/use-team-requests";

const PAGE_SIZE = 20;

export function AdvanceRecordsPanel({ budget }: { budget?: AdvanceBudget }) {
  const t = useTranslations("admin.requests");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<AdvanceRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...TEAM_REQUEST_KEYS.decidedAdvances, page],
    queryFn: () => api.getAdvances({ page, size: PAGE_SIZE, excludePending: true }),
  });

  const rows = data?.content ?? [];

  return (
    <Card className="min-w-0 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("recordsTitle")}</h2>
        <p className="text-xs text-[var(--text-tertiary)]">{t("recordsHint")}</p>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-3 py-2">{t("colEmployee")}</th>
              <th className="px-3 py-2 text-right">{t("colAmount")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
              <th className="px-3 py-2 hidden md:table-cell">{t("colUpdated")}</th>
              <th className="px-3 py-2 text-right">{t("colAction")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">
                  {t("loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">
                  {t("noRecords")}
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{a.staffName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{a.branchName}</p>
                    {a.recordedOnBehalf ? (
                      <span className="mt-1 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                        {t("ownerRecorded")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(a.approvedAmount ?? a.requestedAmount)}
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {t("overMonths", { count: a.approvedInstallments ?? a.requestedInstallments })}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-[var(--text-secondary)] md:table-cell">
                    {dayLabel(a.decidedAt ?? a.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" className={`${btnSecondary} !py-1.5 text-xs`} onClick={() => setEditing(a)}>
                      <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                      {t("editAdvance")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.totalElements > 0 ? (
        <TablePagination
          page={page}
          size={PAGE_SIZE}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
          onSizeChange={() => {}}
        />
      ) : null}
      {editing ? (
        <AdvanceEditDialog advance={editing} budget={budget} onClose={() => setEditing(null)} />
      ) : null}
    </Card>
  );
}

function AdvanceEditDialog({
  advance,
  budget,
  onClose,
}: {
  advance: AdvanceRequest;
  budget?: AdvanceBudget;
  onClose: () => void;
}) {
  const t = useTranslations("admin.requests");
  const queryClient = useQueryClient();
  const canReschedule = advance.status === "APPROVED" || advance.status === "COMPLETED";
  const canRevoke = canReschedule && advance.outstanding > 0;

  const [reason, setReason] = useState(advance.reason ?? "");
  const [note, setNote] = useState(advance.decisionNote ?? "");
  const [amount, setAmount] = useState(String(advance.approvedAmount ?? advance.requestedAmount));
  const [installments, setInstallments] = useState(advance.approvedInstallments ?? advance.requestedInstallments);
  const [firstMonth, setFirstMonth] = useState(advance.firstDeductionMonth?.slice(0, 7) ? `${advance.firstDeductionMonth.slice(0, 7)}-01` : monthStart(1));
  const [error, setError] = useState("");

  const refresh = () => {
    for (const key of Object.values(TEAM_REQUEST_KEYS)) void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: TEAM_REQUEST_KEYS.decidedAdvances });
  };

  const save = useMutation({
    mutationFn: (body: UpdateAdvanceInput) => api.updateAdvance(advance.id, body),
    onSuccess: () => {
      refresh();
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });

  const revoke = useMutation({
    mutationFn: () => api.updateAdvance(advance.id, { revoke: true, note: note.trim() || undefined }),
    onSuccess: () => {
      refresh();
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("actionFailed")),
  });

  const maxInst = budget?.policy.maxInstallments ?? 24;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{t("editAdvanceTitle", { name: advance.staffName })}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{t("editAdvanceHint")}</p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("recordReason")}
            <input className={`${inputClass} mt-1`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("notePlaceholder")}
            <input className={`${inputClass} mt-1`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </label>
          {canReschedule ? (
            <>
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                {t("approveAmount")}
                <input type="number" min={1} className={`${inputClass} mt-1`} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {t("editSettledNote", { amount: formatCurrency(advance.settled) })}
              </p>
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                {t("installments")}
                <select className={`${inputClass} mt-1`} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                  {Array.from({ length: maxInst }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {t("monthsOption", { count: n })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                {t("firstDeduction")}
                <input type="month" className={`${inputClass} mt-1`} value={firstMonth.slice(0, 7)} onChange={(e) => setFirstMonth(`${e.target.value}-01`)} />
              </label>
            </>
          ) : null}
        </div>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={save.isPending || revoke.isPending}
            onClick={() => {
              setError("");
              const body: UpdateAdvanceInput = {
                reason: reason.trim() || undefined,
                note: note.trim() || undefined,
              };
              if (canReschedule) {
                const n = Number(amount);
                if (!Number.isFinite(n) || n < 1) {
                  setError(t("actionFailed"));
                  return;
                }
                body.approvedAmount = n;
                body.installments = installments;
                body.firstDeductionMonth = firstMonth;
              }
              save.mutate(body);
            }}
          >
            {save.isPending ? t("saving") : t("saveChanges")}
          </button>
          {canRevoke ? (
            <button type="button" className={btnSecondary} disabled={save.isPending || revoke.isPending} onClick={() => revoke.mutate()}>
              {revoke.isPending ? t("saving") : t("revokeAdvance")}
            </button>
          ) : null}
          <button type="button" className={btnSecondary} onClick={onClose}>
            {t("cancelEdit")}
          </button>
        </div>
      </div>
    </div>
  );
}
