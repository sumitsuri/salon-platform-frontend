"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, LogIn, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { btnPrimary } from "@/components/ui";
import { StaffSelfPunchSheet } from "@/components/staff/StaffSelfPunchSheet";
import { DashboardWidgetCard } from "@/components/enterprise-ui";
import { StaffMtdPeriodHeader, StaffDailySectionLabel } from "@/components/staff/StaffMtdPeriodHeader";
import { StaffPayrollCoachNote } from "@/components/staff/StaffPayrollCoachNote";
import { StaffAttendanceDayList } from "@/components/staff/StaffAttendanceDayList";
import { cn } from "@/lib/utils";

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function SummaryCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5 text-center min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] truncate">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
    </div>
  );
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StaffAttendanceSection() {
  const t = useTranslations("staff.attendance");
  const tHome = useTranslations("staff.home");
  const queryClient = useQueryClient();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [punchOpen, setPunchOpen] = useState(false);
  const [punchAction, setPunchAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-attendance-month", cursor.year, cursor.month],
    queryFn: () => api.getStaffPortalAttendanceMonth(cursor.year, cursor.month),
  });

  const todayRecord = useMemo(() => data?.days.find((d) => d.workDate === todayIso()), [data?.days]);

  const canCheckIn = !todayRecord?.entryTime;
  const canCheckOut = !!todayRecord?.entryTime && !todayRecord?.exitTime;

  const todayStatus =
    todayRecord?.status === "ABSENT" || !todayRecord?.entryTime
      ? tHome("todayAbsent")
      : todayRecord.exitTime
        ? tHome("todayDone")
        : tHome("todayWorking");

  function shiftMonth(delta: number) {
    const d = new Date(cursor.year, cursor.month - 1 + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  return (
    <DashboardWidgetCard>
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h2 className="dashboard-widget-title">{t("title")}</h2>
            <StaffMtdPeriodHeader periodLabel={data?.periodLabel} compact />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg p-2 hover:bg-[var(--surface-muted)]">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold text-[var(--text-primary)] min-w-[5.5rem] text-center">
              {data?.monthLabel ?? "…"}
            </span>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-2 hover:bg-[var(--surface-muted)]">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">{t("mtdSummary")}</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <SummaryCell label={t("present")} value={data?.presentDays.toFixed(1) ?? "—"} />
            <SummaryCell label={t("absent")} value={data?.absentDays.toFixed(1) ?? "—"} />
            <SummaryCell label={t("halfDays")} value={data?.halfDays.toFixed(1) ?? "—"} />
            <SummaryCell label={t("leave")} value={data?.leaveDays ?? "—"} />
            <SummaryCell label={t("overtime")} value={data?.overtimeHours ?? "—"} />
            <SummaryCell label={t("lessHours")} value={data?.lessHours ?? "—"} />
          </div>
        </div>

        <StaffDailySectionLabel />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 px-3 py-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">{todayStatus}</p>
          {todayRecord?.entryTime && (
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {tHome("todayTimes", {
                in: formatTime(todayRecord.entryTime),
                out: todayRecord.exitTime ? formatTime(todayRecord.exitTime) : tHome("stillIn"),
              })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {canCheckIn && (
            <button
              type="button"
              className={cn(btnPrimary, "flex-1 min-w-[8rem]")}
              onClick={() => {
                setPunchAction("CHECK_IN");
                setPunchOpen(true);
              }}
            >
              <LogIn className="h-4 w-4" />
              {t("checkIn")}
            </button>
          )}
          {canCheckOut && (
            <button
              type="button"
              className={cn(btnPrimary, "flex-1 min-w-[8rem]")}
              onClick={() => {
                setPunchAction("CHECK_OUT");
                setPunchOpen(true);
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("checkOut")}
            </button>
          )}
        </div>

        <div id="payroll-tip">
          <StaffPayrollCoachNote />
        </div>

        <StaffAttendanceDayList days={data?.days ?? []} isLoading={isLoading} />
      </div>

      <StaffSelfPunchSheet
        open={punchOpen}
        action={punchAction}
        onClose={() => setPunchOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["staff-attendance-month"] });
          queryClient.invalidateQueries({ queryKey: ["staff-attendance-month-home"] });
          queryClient.invalidateQueries({ queryKey: ["staff-portal-growth"] });
        }}
      />
    </DashboardWidgetCard>
  );
}
