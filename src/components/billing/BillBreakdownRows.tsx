"use client";

import { Gift, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/utils";
import { cleanBillLabel } from "@/lib/bill-labels";
import type { TenantLocaleKit } from "@/lib/tenant-locale";

export type BillBreakdownPreview = {
  subtotal: number;
  membershipDiscountAmount?: number;
  membershipLabel?: string;
  promoDiscountAmount?: number;
  promoLabel?: string;
  manualDiscountAmount?: number;
  manualDiscountLabel?: string;
  membershipFeeAmount?: number;
  membershipFeeLabel?: string;
  packageFeeAmount?: number;
  packageFeeLabel?: string;
  cgstAmount: number;
  sgstAmount?: number;
  grandTotal: number;
};

type Props = {
  preview: BillBreakdownPreview;
  localeKit?: TenantLocaleKit;
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
          <span className="min-w-0 truncate text-[var(--text-secondary)]">{cleanBillLabel(preview.promoLabel) || tCommon("discount")}</span>
          <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            -{fmt(preview.promoDiscountAmount ?? 0)}
          </span>
        </div>
      )}
      {(preview.manualDiscountAmount ?? 0) > 0 && (
        <div className="flex justify-between gap-2">
          <span className="min-w-0 truncate text-[var(--text-secondary)]">
            {cleanBillLabel(preview.manualDiscountLabel) || tWalkIn("manualDiscount")}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            -{fmt(preview.manualDiscountAmount ?? 0)}
          </span>
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
      {(preview.packageFeeAmount ?? 0) > 0 && (
        <div className="flex justify-between gap-2">
          <span
            className="min-w-0 truncate text-[var(--text-secondary)]"
            title={preview.packageFeeLabel || tWalkIn("packagePurchase")}
          >
            {preview.packageFeeLabel || tWalkIn("packagePurchase")}
          </span>
          <span className="shrink-0 tabular-nums font-medium text-[var(--text-primary)]">
            {fmt(preview.packageFeeAmount ?? 0)}
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

/** Package bundle line for service lists when sold with a visit. */
export function packageFeeServiceLine(preview?: {
  packageFeeAmount?: number;
  packageFeeLabel?: string;
} | null) {
  if (!preview || (preview.packageFeeAmount ?? 0) <= 0) return null;
  return {
    name: preview.packageFeeLabel || "Service package",
    amount: preview.packageFeeAmount ?? 0,
  };
}

type OfferingLineProps = {
  name: string;
  amount: number;
  localeKit?: TenantLocaleKit;
  variant: "membership" | "package";
};

/** Styled bill line for membership or package offerings (mirrors walk-in payment review). */
export function BillOfferingLineItem({ name, amount, localeKit, variant }: OfferingLineProps) {
  const isMembership = variant === "membership";
  return (
    <li
      className={
        isMembership
          ? "flex justify-between gap-3 items-start rounded-md border-l-2 border-violet-400 bg-violet-50/50 py-1.5 pl-2 dark:border-violet-600 dark:bg-violet-950/20"
          : "flex justify-between gap-3 items-start rounded-md border-l-2 border-sky-400 bg-sky-50/50 py-1.5 pl-2 dark:border-sky-600 dark:bg-sky-950/20"
      }
    >
      <div className="min-w-0 flex items-center gap-1.5">
        {isMembership ? (
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
        ) : (
          <Gift className="h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        )}
        <p className="font-medium text-sm text-[var(--text-primary)] truncate">{name}</p>
      </div>
      <span className="font-semibold text-sm text-[var(--text-primary)] shrink-0 tabular-nums">
        {formatMoney(amount, localeKit)}
      </span>
    </li>
  );
}
