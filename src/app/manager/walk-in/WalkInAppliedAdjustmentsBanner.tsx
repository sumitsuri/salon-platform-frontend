"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillPreview } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";

interface WalkInAppliedAdjustmentsBannerProps {
  billPreview: BillPreview;
  localeKit: TenantLocaleKit;
  manualDiscountApplied: boolean;
  promoLocked: boolean;
  className?: string;
}

/** Read-only confirmation that a discount is on the bill — edit via the single discount button. */
export function WalkInAppliedAdjustmentsBanner({
  billPreview,
  localeKit,
  manualDiscountApplied,
  promoLocked,
  className,
}: WalkInAppliedAdjustmentsBannerProps) {
  const t = useTranslations("manager.walkIn");

  const promoAmount = billPreview.promoDiscountAmount ?? 0;
  const manualAmount = billPreview.manualDiscountAmount ?? 0;
  const hasPromo = promoAmount > 0;
  const hasManual = manualAmount > 0;

  if (!hasPromo && !hasManual) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-300/80 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/25",
        className
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            {t("discountAppliedTitle")}
          </p>
          {hasPromo && (
            <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] truncate">
              {billPreview.promoLabel || t("applyPromo")} · -{formatCurrency(promoAmount, localeKit)}
            </p>
          )}
          {hasManual && (
            <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] truncate">
              {billPreview.manualDiscountLabel || t("manualDiscount")} · -{formatCurrency(manualAmount, localeKit)}
            </p>
          )}
          {promoLocked && !hasManual ? (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{t("promoBlocksManual")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
