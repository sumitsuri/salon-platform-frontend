"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  defaultExpanded?: boolean;
};

/** Highlighted, collapsible note — punctuality, approved leave, payroll adjustments. */
export function StaffPayrollCoachNote({ className, defaultExpanded = true }: Props) {
  const t = useTranslations("staff.home");
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-sky-400/70 bg-gradient-to-br from-sky-100/95 via-white to-emerald-50/80 shadow-sm",
        "dark:border-sky-500/50 dark:from-sky-950/50 dark:via-[var(--surface)] dark:to-emerald-950/30",
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2.5 p-3.5 text-left touch-manipulation"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-black text-sky-950 dark:text-sky-100">{t("payrollCoachTitle")}</span>
            <ChevronDown
              className={cn("h-5 w-5 shrink-0 text-sky-700 transition-transform dark:text-sky-300", expanded && "rotate-180")}
              aria-hidden
            />
          </span>
          {!expanded && (
            <span className="mt-1 block text-[11px] font-medium text-sky-800/90 dark:text-sky-200/90 line-clamp-2">
              {t("payrollCoachTeaser")}
            </span>
          )}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-sky-300/50 px-3.5 pb-3.5 pt-2 dark:border-sky-800/50">
          <p className="text-[11px] leading-relaxed font-medium text-[var(--text-primary)]">{t("payrollCoachBody")}</p>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{t("payrollCoachLeaves")}</p>
        </div>
      )}
    </div>
  );
}
