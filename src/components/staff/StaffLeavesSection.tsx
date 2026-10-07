"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, CreateLeaveRequest } from "@/lib/api";
import { Card, StatusBadge, inputClass, btnPrimary, AlertBanner } from "@/components/ui";
import { DashboardWidgetCard } from "@/components/enterprise-ui";
import { useClientPagedList, DEFAULT_LIST_PAGE_SIZE } from "@/lib/use-client-paged-list";
import { ListPageArrows } from "@/components/staff/ListPageArrows";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StaffLeavesSection() {
  const t = useTranslations("staff.leaves");
  const queryClient = useQueryClient();
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["staff-portal-profile"],
    queryFn: () => api.getStaffPortalProfile(),
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["staff-portal-leaves"],
    queryFn: () => api.getStaffPortalLeaves(),
  });

  const leavesPager = useClientPagedList(leaves, DEFAULT_LIST_PAGE_SIZE);

  const apply = useMutation({
    mutationFn: () => {
      if (!profile?.staffId) throw new Error(t("profileMissing"));
      return api.applyStaffPortalLeave({
        staffId: profile.staffId,
        startDate: start,
        endDate: end,
        reason,
      } as CreateLeaveRequest);
    },
    onSuccess: () => {
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["staff-portal-leaves"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("applyFailed")),
  });

  return (
    <div id="leave-apply" className="min-w-0 scroll-mt-24">
    <DashboardWidgetCard>
      <div className="space-y-3 p-3 sm:p-4">
        <h2 className="dashboard-widget-title">{t("title")}</h2>
        <p className="text-xs text-[var(--text-secondary)] -mt-2">{t("subtitle")}</p>

        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t("applyTitle")}</p>
          {error && <AlertBanner variant="error">{error}</AlertBanner>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              {t("from")}
              <input type="date" className={`${inputClass} mt-1`} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              {t("to")}
              <input type="date" className={`${inputClass} mt-1`} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] block">
            {t("reason")}
            <textarea
              className={`${inputClass} mt-1 min-h-[72px] w-full`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
            />
          </label>
          <button
            type="button"
            className={btnPrimary}
            disabled={apply.isPending || !reason.trim()}
            onClick={() => {
              setError("");
              apply.mutate();
            }}
          >
            {apply.isPending ? t("submitting") : t("submit")}
          </button>
          <p className="text-[11px] text-[var(--text-tertiary)]">{t("approvalHint")}</p>
        </div>

        <div>
          <p className="section-label mb-2">{t("history")}</p>
          <Card className="divide-y divide-[var(--border)] overflow-hidden p-0">
            {isLoading && <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loading")}</p>}
            {!isLoading && leaves.length === 0 && (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
            )}
            {!isLoading &&
              leavesPager.pageItems.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {leave.startDate} → {leave.endDate}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{leave.reason}</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
            {!isLoading && leavesPager.showPager && (
              <ListPageArrows
                page={leavesPager.page}
                totalPages={leavesPager.totalPages}
                hasPrev={leavesPager.hasPrev}
                hasNext={leavesPager.hasNext}
                onPrev={leavesPager.goPrev}
                onNext={leavesPager.goNext}
              />
            )}
          </Card>
        </div>
      </div>
    </DashboardWidgetCard>
    </div>
  );
}
