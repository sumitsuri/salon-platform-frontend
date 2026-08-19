"use client";

import { Pencil, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillPreview } from "@/lib/api";
import { cleanBillLabel } from "@/lib/bill-labels";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";

interface WalkInAppliedAdjustmentsBannerProps {
  billPreview: BillPreview;
  localeKit: TenantLocaleKit;
  manualDiscountApplied: boolean;
  promoLocked: boolean;
  onEdit?: () => void;
  className?: string;
}

/** Compact, tappable discount confirmation — tap pencil to edit. */
export function WalkInAppliedAdjustmentsBanner({
  billPreview,
  localeKit,
  manualDiscountApplied,
  promoLocked,
  onEdit,
  className,
}: WalkInAppliedAdjustmentsBannerProps) {
  const t = useTranslations("manager.walkIn");

  const promoAmount = billPreview.promoDiscountAmount ?? 0;
  const manualAmount = billPreview.manualDiscountAmount ?? 0;
  const hasPromo = promoAmount > 0;
  const hasManual = manualAmount > 0;

  if (!hasPromo && !hasManual) return null;

  const promoLabel = cleanBillLabel(billPreview.promoLabel) || t("applyPromo");
  const manualLabel = cleanBillLabel(billPreview.manualDiscountLabel) || t("manualDiscount");

  const content = (
    <>
      <Tag className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1 text-left">
        {hasPromo && (
          <p className="truncate text-xs font-semibold text-[var(--text-primary)] leading-tight">
            {promoLabel} · -{formatCurrency(promoAmount, localeKit)}
          </p>
        )}
        {hasManual && (
          <p className="truncate text-xs font-semibold text-[var(--text-primary)] leading-tight">
            {manualLabel} · -{formatCurrency(manualAmount, localeKit)}
          </p>
        )}
        {promoLocked && !hasManual ? (
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-tertiary)] leading-tight">{t("promoBlocksManual")}</p>
        ) : null}
      </div>
      {onEdit ? (
        <Pencil className="h-3.5 w-3.5 shrink-0 opacity-60 text-amber-800 dark:text-amber-200" aria-hidden />
      ) : null}
    </>
  );

  const styles = cn(
    "flex min-w-0 items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50/70 px-2.5 py-1.5",
    "dark:border-amber-800/50 dark:bg-amber-950/30",
    className
  );

  if (onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className={cn(styles, "w-full touch-manipulation transition hover:bg-amber-100/80 active:bg-amber-100 dark:hover:bg-amber-950/45")}
        aria-label={manualDiscountApplied || promoLocked ? t("editDiscount") : t("applyManualDiscount")}
      >
        {content}
      </button>
    );
  }

  return <div className={styles}>{content}</div>;
}
