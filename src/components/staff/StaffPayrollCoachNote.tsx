"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  defaultExpanded?: boolean;
};

/** Collapsible payroll tip — high contrast on mobile gradient backgrounds. */
export function StaffPayrollCoachNote({ className, defaultExpanded = false }: Props) {
  const t = useTranslations("staff.home");
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        "staff-payroll-coach-note overflow-hidden rounded-xl border-2 border-amber-500/80 bg-[var(--surface)] shadow-md",
        "ring-2 ring-amber-400/25",
        "dark:border-amber-600/70 dark:ring-amber-500/20",
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-3 p-3.5 text-left touch-manipulation",
          "bg-gradient-to-r from-amber-100/90 via-[var(--surface)] to-[var(--surface)]",
          "dark:from-amber-950/40 dark:via-[var(--surface)] dark:to-[var(--surface)]",
          !expanded && "max-md:from-amber-100 max-md:via-amber-50/95 max-md:to-amber-50/80",
        )}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm dark:bg-amber-500"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-black leading-snug text-[var(--text-primary)]">{t("payrollCoachTitle")}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-amber-800/80 transition-transform dark:text-amber-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </span>
          {!expanded && (
            <span className="mt-1.5 block text-xs font-semibold leading-snug text-[var(--text-secondary)] line-clamp-2">
              {t("payrollCoachTeaser")}
            </span>
          )}
          {!expanded && (
            <span className="mt-1.5 inline-flex rounded-md bg-amber-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              {t("payrollCoachTapHint")}
            </span>
          )}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t-2 border-amber-200/80 bg-[var(--surface)] px-3.5 pb-3.5 pt-2.5 dark:border-amber-900/50">
          <p className="text-xs leading-relaxed font-medium text-[var(--text-primary)]">{t("payrollCoachBody")}</p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{t("payrollCoachLeaves")}</p>
        </div>
      )}
    </div>
  );
}
