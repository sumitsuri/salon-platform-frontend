"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  periodLabel?: string;
  className?: string;
  compact?: boolean;
};

/** Month-to-date scope chip — aligned with admin brand-target period hints. */
export function StaffMtdPeriodHeader({ periodLabel, className, compact }: Props) {
  const t = useTranslations("employee.home");
  if (!periodLabel) return null;

  return (
    <p className={cn("min-w-0", className)}>
      <span
        className={cn(
          "inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/60 px-2.5 py-1",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        <span className="font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{t("mtdLabel")}</span>
        <span className="font-semibold text-[var(--text-secondary)] truncate">{periodLabel}</span>
      </span>
    </p>
  );
}

export function StaffDailySectionLabel({ className }: { className?: string }) {
  const t = useTranslations("employee.home");
  return (
    <div className={cn("flex items-center gap-2 pt-1", className)}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{t("todayLabel")}</span>
      <span className="h-px min-w-[2rem] flex-1 bg-[var(--border)]" aria-hidden />
    </div>
  );
}
