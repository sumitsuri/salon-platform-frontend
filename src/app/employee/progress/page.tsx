"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageHeader, Card } from "@/components/ui";
import { StaffPageShell } from "@/components/employee/StaffPageShell";
import { StaffGoalsReadOnlyList } from "@/components/employee/StaffGoalsReadOnlyList";
import { DashboardWidgetCard } from "@/components/enterprise-ui";

export default function StaffProgressPage() {
  const tReviews = useTranslations("employee.reviews");
  const t = useTranslations("employee.progress");
  const [goalsOpen, setGoalsOpen] = useState(false);

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

      {goals.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] touch-manipulation hover:bg-[var(--surface-muted)]/40"
            onClick={() => setGoalsOpen((v) => !v)}
            aria-expanded={goalsOpen}
          >
            <span>{t("viewAssignedGoals", { count: goals.length })}</span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform", goalsOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {goalsOpen ? (
            <div className="border-t border-[var(--border)] px-3 py-3 sm:px-4">
              <StaffGoalsReadOnlyList goals={goals} loading={goalsLoading} />
            </div>
          ) : null}
        </div>
      ) : null}
    </StaffPageShell>
  );
}
