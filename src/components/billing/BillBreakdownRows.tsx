"use client";

import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/utils";
import type { TenantLocaleKit } from "@/lib/tenant-locale";

export type BillBreakdownPreview = {
  subtotal: number;
  membershipDiscountAmount?: number;
  membershipLabel?: string;
  promoDiscountAmount?: number;
  promoLabel?: string;
  manualDiscountAmount?: number;
  manualDiscountLabel?: string;
  taxableAmount?: number;
  membershipFeeAmount?: number;
  membershipFeeLabel?: string;
  cgstAmount: number;
  sgstAmount?: number;
  grandTotal: number;
};

type Props = {
  preview: BillBreakdownPreview;
  localeKit?: TenantLocaleKit;
  /** Show taxable amount row (walk-in payment step). */
  showTaxable?: boolean;
  /** Override CGST/SGST display (walk-in tax override). */
  cgstDisplay?: number;
  sgstDisplay?: number;
  /** Hide grand total row when parent shows a computed total (e.g. tax override). */
  hideGrandTotal?: boolean;
  grandTotalOverride?: number;
  className?: string;
};

export function BillBreakdownRows({
  preview,
  localeKit,
  showTaxable = false,
  cgstDisplay,
  sgstDisplay,
  hideGrandTotal = false,
  grandTotalOverride,
  className,
}: Props) {
  const tCommon = useTranslations("common");
  const tWalkIn = useTranslations("manager.walkIn");
  const fmt = (n: number) => formatMoney(n, localeKit);
  const cgst = cgstDisplay ?? preview.cgstAmount;
  const sgst = sgstDisplay ?? preview.sgstAmount ?? 0;

  return (
    <div className={className ?? "space-y-2 text-sm"}>
      <div className="flex justify-between">
        <span className="text-[var(--text-secondary)]">{tCommon("subtotal")}</span>
        <span>{fmt(preview.subtotal)}</span>
      </div>
      {(preview.membershipDiscountAmount ?? 0) > 0 && (
        <div className="flex justify-between gap-2">
          <span className="min-w-0 truncate text-[var(--text-secondary)]">
            {preview.membershipLabel || tWalkIn("membershipDiscount")}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            -{fmt(preview.membershipDiscountAmount ?? 0)}
          </span>
        </div>
      )}
      {(preview.promoDiscountAmount ?? 0) > 0 && (
        <div className="flex justify-between gap-2">
          <span className="min-w-0 truncate text-[var(--text-secondary)]">{preview.promoLabel || tCommon("discount")}</span>
          <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            -{fmt(preview.promoDiscountAmount ?? 0)}
          </span>
        </div>
      )}
      {(preview.manualDiscountAmount ?? 0) > 0 && (
        <div className="flex justify-between gap-2">
          <span className="min-w-0 truncate text-[var(--text-secondary)]">
            {preview.manualDiscountLabel || tWalkIn("manualDiscount")}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            -{fmt(preview.manualDiscountAmount ?? 0)}
          </span>
        </div>
      )}
      {showTaxable && preview.taxableAmount != null && (
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">{tWalkIn("taxableAmount")}</span>
          <span>{fmt(preview.taxableAmount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-[var(--text-secondary)]">CGST</span>
        <span>{fmt(cgst)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--text-secondary)]">SGST</span>
        <span>{fmt(sgst)}</span>
      </div>
      {(preview.membershipFeeAmount ?? 0) > 0 && (
        <div className="flex justify-between gap-2">
          <span
            className="min-w-0 truncate text-[var(--text-secondary)]"
            title={preview.membershipFeeLabel || tWalkIn("membershipPurchase")}
          >
            {preview.membershipFeeLabel || tWalkIn("membershipPurchase")}
          </span>
          <span className="shrink-0 tabular-nums font-medium text-[var(--text-primary)]">
            {fmt(preview.membershipFeeAmount ?? 0)}
          </span>
        </div>
      )}
      {!hideGrandTotal && (
        <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]">
          <span>{tCommon("grandTotal")}</span>
          <span className="text-[var(--brand-text)]">{fmt(grandTotalOverride ?? preview.grandTotal)}</span>
        </div>
      )}
    </div>
  );
}

/** Membership fee line for service lists when sold with a visit. */
export function membershipFeeServiceLine(preview?: {
  membershipFeeAmount?: number;
  membershipFeeLabel?: string;
} | null) {
  if (!preview || (preview.membershipFeeAmount ?? 0) <= 0) return null;
  return {
    name: preview.membershipFeeLabel || "Membership card",
    amount: preview.membershipFeeAmount ?? 0,
  };
}
