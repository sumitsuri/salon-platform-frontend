"use client";

import { Pencil, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface WalkInMobilePaymentActionsProps {
  saving: boolean;
  payDisabled: boolean;
  discountSavings: number;
  hasBillDiscount: boolean;
  grandTotalDisplay: string;
  discountDisplay: string;
  onDiscount: () => void;
  onPay: () => void;
}

export function WalkInMobilePaymentActions({
  saving,
  payDisabled,
  discountSavings,
  hasBillDiscount,
  grandTotalDisplay,
  discountDisplay,
  onDiscount,
  onPay,
}: WalkInMobilePaymentActionsProps) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex min-h-[2.75rem] items-stretch">
        <button
          type="button"
          onClick={onDiscount}
          className={cn(
            "flex w-[36%] max-w-[9rem] shrink-0 items-center justify-center gap-1 px-2 py-1.5 touch-manipulation transition",
            hasBillDiscount
              ? "bg-amber-50 text-amber-950 hover:bg-amber-100/90 active:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/55"
              : "bg-amber-50/80 text-amber-950 hover:bg-amber-100/90 active:bg-amber-100 dark:bg-amber-950/45 dark:text-amber-100 dark:hover:bg-amber-950/55"
          )}
          aria-label={hasBillDiscount ? t("editDiscount") : t("applyManualDiscount")}
        >
          <Tag className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          {hasBillDiscount && discountSavings > 0 ? (
            <span className="text-xs font-bold tabular-nums leading-none">{discountDisplay}</span>
          ) : (
            <span className="text-[10px] font-bold leading-tight">{t("discountShort")}</span>
          )}
          {hasBillDiscount ? (
            <Pencil className="h-3 w-3 shrink-0 opacity-65 text-amber-700 dark:text-amber-300" aria-hidden />
          ) : null}
        </button>
        <div className="w-px shrink-0 bg-[var(--border)]" aria-hidden />
        <button
          type="button"
          onClick={onPay}
          disabled={payDisabled}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-3 py-2 touch-manipulation transition",
            "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          <span className="text-[11px] font-bold leading-tight">
            {saving ? tCommon("processing") : t("billNow")}
          </span>
          {!saving ? (
            <span className="text-sm font-bold tabular-nums leading-none">{grandTotalDisplay}</span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
