"use client";

import { useTranslations } from "next-intl";
import { Target } from "lucide-react";
import { Card } from "@/components/ui";
import type { StaffGoalItem } from "@/lib/api";

type Props = {
  goals: StaffGoalItem[];
  loading?: boolean;
};

/** Manager-assigned targets — read-only reference (no progress math in UI). */
export function StaffGoalsReadOnlyList({ goals, loading }: Props) {
  const t = useTranslations("staff.goals");

  if (loading) {
    return <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>;
  }

  if (goals.length === 0) {
    return <Card className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</Card>;
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium leading-snug text-[var(--text-tertiary)]">{t("readOnlyHint")}</p>
      <ul className="space-y-2">
        {goals.map((goal) => (
          <li key={goal.id}>
            <Card className="p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-text)]">
                  <Target className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{goal.title}</p>
                  {goal.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{goal.description}</p>
                  ) : null}
                  {(goal.periodStart || goal.periodEnd) && (
                    <p className="mt-2 text-[10px] font-medium text-[var(--text-tertiary)]">
                      {t("period")}
                      {goal.periodStart ?? "…"}
                      {goal.periodEnd ? ` – ${goal.periodEnd}` : ""}
                    </p>
                  )}
                  {goal.status === "ACTIVE" ? (
                    <span className="mt-2 inline-block rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                      {t("statusActive")}
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
