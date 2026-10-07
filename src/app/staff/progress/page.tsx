"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Target } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Card } from "@/components/ui";
import { StaffPageShell } from "@/components/staff/StaffPageShell";
import { DashboardWidgetCard } from "@/components/enterprise-ui";

export default function StaffProgressPage() {
  const tGoals = useTranslations("staff.goals");
  const tReviews = useTranslations("staff.reviews");
  const t = useTranslations("staff.progress");

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["staff-portal-goals"],
    queryFn: () => api.getStaffPortalGoals(),
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["staff-portal-reviews"],
    queryFn: () => api.getStaffPortalReviews(),
  });

  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-2 md:gap-3 lg:grid-cols-2 lg:items-start min-w-0">
        <DashboardWidgetCard>
          <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-light)] text-[var(--brand-text)]">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <h2 className="dashboard-widget-title">{tGoals("title")}</h2>
                <p className="text-xs text-[var(--text-secondary)]">{tGoals("subtitle")}</p>
              </div>
            </div>
            {goalsLoading && <p className="text-sm text-[var(--text-secondary)]">{tGoals("loading")}</p>}
            {!goalsLoading && goals.length === 0 && (
              <Card className="p-4 text-sm text-[var(--text-secondary)]">{tGoals("empty")}</Card>
            )}
            <div className="space-y-3">
              {goals.map((goal) => (
                <Card key={goal.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[var(--text-primary)]">{goal.title}</p>
                    <span className="text-xs font-bold text-[var(--accent)]">{goal.progressPercent}%</span>
                  </div>
                  {goal.description && <p className="mt-1 text-xs text-[var(--text-secondary)]">{goal.description}</p>}
                  {goal.targetValue != null && (
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      {goal.currentValue ?? 0} / {goal.targetValue} {goal.metricUnit ?? ""}
                    </p>
                  )}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.min(100, Number(goal.progressPercent) || 0)}%` }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DashboardWidgetCard>

        <DashboardWidgetCard>
          <div className="p-3 sm:p-4 space-y-3">
            <div>
              <h2 className="dashboard-widget-title">{tReviews("title")}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("reviewsHint")}</p>
            </div>
            {reviewsLoading && <p className="text-sm text-[var(--text-secondary)]">{tReviews("loading")}</p>}
            {!reviewsLoading && reviews.length === 0 && (
              <Card className="p-4 text-sm text-[var(--text-secondary)]">{tReviews("empty")}</Card>
            )}
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[var(--text-primary)]">{review.periodLabel}</p>
                    {review.overallRating != null && (
                      <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold">
                        {review.overallRating}/5
                      </span>
                    )}
                  </div>
                  {review.salesAchievementPercent != null && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {tReviews("salesAchievement", { percent: review.salesAchievementPercent })}
                    </p>
                  )}
                  {review.attendanceScore != null && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {tReviews("attendanceScore", { score: review.attendanceScore })}
                    </p>
                  )}
                  {review.strengths && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{tReviews("strengths")}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{review.strengths}</p>
                    </div>
                  )}
                  {review.improvements && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{tReviews("improvements")}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{review.improvements}</p>
                    </div>
                  )}
                  {review.managerNotes && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{tReviews("managerNotes")}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{review.managerNotes}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </DashboardWidgetCard>
      </div>
    </StaffPageShell>
  );
}
