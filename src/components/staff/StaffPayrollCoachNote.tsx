"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "inline" | "card";
};

/** Positive framing for punctuality, approved leave, and post-approval adjustments. */
export function StaffPayrollCoachNote({ className, variant = "card" }: Props) {
  const t = useTranslations("staff.home");

  return (
    <div
      className={cn(
        variant === "card" &&
          "rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-[var(--surface)] to-emerald-50/40 p-3.5 dark:border-sky-900/40 dark:from-sky-950/25 dark:to-emerald-950/15",
        variant === "inline" && "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2.5",
        className,
      )}
    >
      <div className="flex gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-bold text-[var(--text-primary)]">{t("payrollCoachTitle")}</p>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{t("payrollCoachBody")}</p>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{t("payrollCoachLeaves")}</p>
        </div>
      </div>
    </div>
  );
}
