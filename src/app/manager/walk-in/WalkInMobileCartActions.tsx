"use client";

import { Bookmark, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface WalkInMobileCartActionsProps {
  saving: boolean;
  proceedDisabled: boolean;
  saveDisabled: boolean;
  onProceed: () => void;
  onSave: () => void;
}

export function WalkInMobileCartActions({
  saving,
  proceedDisabled,
  saveDisabled,
  onProceed,
  onSave,
}: WalkInMobileCartActionsProps) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex min-h-[2.75rem] items-stretch">
        <button
          type="button"
          onClick={onProceed}
          disabled={proceedDisabled}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-1.5 px-3 py-2 touch-manipulation transition",
            "bg-[var(--brand)] text-[var(--brand-on-brand)] hover:opacity-95 active:opacity-90",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate text-xs font-bold">
              {saving ? tCommon("processing") : t("mobileReviewAndBill")}
            </span>
          </span>
          {!saving ? <ChevronRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden /> : null}
        </button>
        <div className="w-px shrink-0 bg-[var(--border)]" aria-hidden />
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2.5 py-2 touch-manipulation transition",
            "bg-sky-50 text-sky-900 hover:bg-sky-100/90 active:bg-sky-100",
            "dark:bg-sky-950/40 dark:text-sky-100 dark:hover:bg-sky-950/55",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
          aria-label={t("mobileSaveVisit")}
        >
          <Bookmark className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
          <span className="text-[11px] font-bold leading-tight">{t("mobileSaveVisit")}</span>
        </button>
      </div>
    </div>
  );
}
