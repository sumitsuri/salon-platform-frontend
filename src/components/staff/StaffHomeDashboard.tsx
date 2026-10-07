"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronRight, Clock, Star, Target, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { StaffSelfPunchSheet } from "@/components/staff/StaffSelfPunchSheet";
import { StaffTodayPunchBar } from "@/components/staff/StaffTodayPunchBar";
import { StaffPageShell } from "@/components/staff/StaffPageShell";
import { DashboardWidgetCard } from "@/components/enterprise-ui";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function ProgressBar({ percent }: { percent: number }) {
  const w = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
      <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${w}%` }} />
    </div>
  );
}

function SummaryCard({
  href,
  icon: Icon,
  title,
  periodLabel,
  className,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  periodLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("block min-w-0 touch-manipulation active:scale-[0.99] transition-transform", className)}>
      <DashboardWidgetCard className="hover:ring-1 hover:ring-[var(--border)]">
        <div className="p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-secondary)]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
              </div>
              {periodLabel ? (
                <p className="mt-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                  {periodLabel}
                </p>
              ) : null}
              <div className="mt-2">{children}</div>
            </div>
          </div>
        </div>
      </DashboardWidgetCard>
    </Link>
  );
}

export function StaffHomeDashboard() {
  const t = useTranslations("staff.home");
  const queryClient = useQueryClient();
  const [punchOpen, setPunchOpen] = useState(false);
  const [punchAction, setPunchAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  const { data: profile } = useQuery({
    queryKey: ["staff-portal-profile"],
    queryFn: () => api.getStaffPortalProfile(),
  });
  const { data: growth } = useQuery({
    queryKey: ["staff-portal-growth"],
    queryFn: () => api.getStaffPortalGrowth(),
  });
  const { data: attendance } = useQuery({
    queryKey: ["staff-attendance-month-home"],
    queryFn: () => api.getStaffPortalAttendanceMonth(),
  });
  const { data: leaves = [] } = useQuery({
    queryKey: ["staff-portal-leaves"],
    queryFn: () => api.getStaffPortalLeaves(),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["staff-portal-goals"],
    queryFn: () => api.getStaffPortalGoals(),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["staff-portal-reviews"],
    queryFn: () => api.getStaffPortalReviews(),
  });

  const todayRecord = useMemo(
    () => attendance?.days.find((d) => d.workDate === todayIso()),
    [attendance?.days],
  );

  const canCheckIn = !todayRecord?.entryTime;
  const canCheckOut = !!todayRecord?.entryTime && !todayRecord?.exitTime;
  const pendingLeaves = leaves.filter((l) => l.status === "PENDING").length;
  const topGoal = goals.find((g) => g.status === "ACTIVE");
  const latestReview = reviews[0];

  const paceBadge = growth
    ? growth.meetingTarget
      ? t("onTarget")
      : growth.onTrack
        ? t("onPace")
        : t("catchUp")
    : null;

  const todayStatus =
    todayRecord?.status === "ABSENT" || !todayRecord?.entryTime
      ? t("todayAbsent")
      : todayRecord.exitTime
        ? t("todayDone")
        : t("todayWorking");

  const timeLine = todayRecord?.entryTime
    ? t("todayTimes", {
        in: formatTime(todayRecord.entryTime),
        out: todayRecord.exitTime ? formatTime(todayRecord.exitTime) : t("stillIn"),
      })
    : undefined;

  const shiftComplete = !canCheckIn && !canCheckOut && !!todayRecord?.exitTime;

  return (
    <StaffPageShell className="pb-6">
      <PageHeader
        title={t("greeting", { name: profile?.name?.split(" ")[0] || "…" })}
        subtitle={profile?.designation}
      />

      <StaffTodayPunchBar
        todayStatus={shiftComplete ? t("actionShiftDone") : todayStatus}
        timeLine={timeLine}
        canCheckIn={canCheckIn}
        canCheckOut={canCheckOut}
        shiftComplete={shiftComplete}
        onCheckIn={() => {
          setPunchAction("CHECK_IN");
          setPunchOpen(true);
        }}
        onCheckOut={() => {
          setPunchAction("CHECK_OUT");
          setPunchOpen(true);
        }}
      />

      <div className="grid gap-2.5 md:gap-3 md:grid-cols-2 xl:grid-cols-3 min-w-0">
        {growth && (
          <SummaryCard href="/staff/sales" icon={TrendingUp} title={t("salesTitle")} periodLabel={growth.periodLabel}>
            <div className="flex items-end justify-between gap-2">
              <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(growth.actualSales)}</p>
              {paceBadge && (
                <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                  {paceBadge}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {t("targetLine", {
                percent: growth.achievementPercent,
                target: formatCurrency(growth.monthlySalesTarget),
              })}
            </p>
            <div className="mt-2">
              <ProgressBar percent={Number(growth.achievementPercent) || 0} />
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
              {t("todayLabel")}: {formatCurrency(growth.todaySales ?? 0)} · {t("todaySalesLine", { count: growth.todaySalesCount ?? 0 })}
            </p>
          </SummaryCard>
        )}

        <SummaryCard href="/staff/time" icon={Clock} title={t("timeTitle")} periodLabel={attendance?.periodLabel}>
          {attendance && (
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
              {t("mtdSummary")}: {Math.round(attendance.presentDays)} {t("present")} · {Math.round(attendance.absentDays)}{" "}
              {t("absent")}
              {pendingLeaves > 0 ? ` · ${t("pendingLeaves", { count: pendingLeaves })}` : null}
            </p>
          )}
          <p className="mt-2 text-[10px] font-medium text-[var(--text-tertiary)] leading-snug">{t("payrollCoachShort")}</p>
        </SummaryCard>

        <SummaryCard href="/staff/progress" icon={Target} title={t("progressTitle")} className="md:col-span-2 xl:col-span-1">
          {topGoal ? (
            <>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{topGoal.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t("goalProgress", { percent: topGoal.progressPercent })}</p>
              <div className="mt-1.5">
                <ProgressBar percent={Number(topGoal.progressPercent) || 0} />
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">{t("noGoals")}</p>
          )}
          {latestReview && (
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <Star className="h-3 w-3 shrink-0" />
              {latestReview.periodLabel}
              {latestReview.overallRating != null ? ` · ${latestReview.overallRating}/5` : null}
            </p>
          )}
        </SummaryCard>
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
    </StaffPageShell>
  );
}
