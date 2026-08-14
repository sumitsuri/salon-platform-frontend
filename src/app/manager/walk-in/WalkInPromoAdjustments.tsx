"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApplicablePromo } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";
import { inputClass, selectClass } from "@/components/ui";

type DiscountKind = "" | "FLAT" | "PERCENT";

interface WalkInPromoAdjustmentsProps {
  coupons: ApplicablePromo[];
  offers: ApplicablePromo[];
  localeKit: TenantLocaleKit;
  selectedCouponId: string;
  selectedOfferId: string;
  billDiscountType: DiscountKind;
  billDiscountValue: string;
  promoLocked: boolean;
  manualDiscountApplied: boolean;
  manualDiscountAmount?: number;
  manualDiscountLabel?: string;
  disabled?: boolean;
  onCouponChange: (id: string) => void;
  onOfferChange: (id: string) => void;
  onBillDiscountTypeChange: (v: DiscountKind) => void;
  onBillDiscountValueChange: (v: string) => void;
  onClearManualDiscount: () => void;
  applyPending?: boolean;
}

function DiscountTypeToggle({
  value,
  currencySymbol,
  disabled,
  onChange,
}: {
  value: DiscountKind;
  currencySymbol: string;
  disabled?: boolean;
  onChange: (v: "FLAT" | "PERCENT") => void;
}) {
  const effective = value === "FLAT" ? "FLAT" : "PERCENT";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-0.5",
        disabled && "opacity-50 pointer-events-none"
      )}
      role="group"
      aria-label="Discount type"
    >
      {(["PERCENT", "FLAT"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={cn(
            "min-h-9 min-w-9 rounded px-2 text-xs font-bold transition touch-manipulation",
            effective === kind
              ? "bg-[var(--surface)] text-[var(--brand-text)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {kind === "PERCENT" ? "%" : currencySymbol}
        </button>
      ))}
    </div>
  );
}

export function WalkInPromoAdjustments({
  coupons,
  offers,
  localeKit,
  selectedCouponId,
  selectedOfferId,
  billDiscountType,
  billDiscountValue,
  promoLocked,
  manualDiscountApplied,
  manualDiscountAmount,
  disabled,
  onCouponChange,
  onOfferChange,
  onBillDiscountTypeChange,
  onBillDiscountValueChange,
  onClearManualDiscount,
  applyPending,
}: WalkInPromoAdjustmentsProps) {
  const t = useTranslations("manager.walkIn");
  const currencySymbol = localeKit.currency === "INR" ? "₹" : localeKit.currency;
  const effectiveType: "FLAT" | "PERCENT" = billDiscountType === "FLAT" ? "FLAT" : "PERCENT";

  function onTypeChange(kind: "FLAT" | "PERCENT") {
    onBillDiscountTypeChange(kind);
  }

  function onValueChange(raw: string) {
    if (!billDiscountType) {
      onBillDiscountTypeChange("PERCENT");
    }
    onBillDiscountValueChange(raw);
  }

  return (
    <div className="space-y-2.5">
      <label className="block min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{t("manualDiscount")}</span>
          <span className="flex items-center gap-1.5 shrink-0">
            {applyPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-tertiary)]" aria-hidden />
            ) : null}
            {manualDiscountApplied && (manualDiscountAmount ?? 0) > 0 ? (
              <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                -{formatCurrency(manualDiscountAmount ?? 0, localeKit)}
              </span>
            ) : null}
          </span>
        </div>

        {promoLocked ? (
          <p className="text-[11px] text-[var(--text-tertiary)] leading-snug rounded-md border border-[var(--border)] bg-[var(--surface-muted)]/40 px-2.5 py-2">
            {t("promoBlocksManual")}
          </p>
        ) : (
          <div
            className={cn(
              "flex items-center gap-1.5 min-w-0 rounded-lg border bg-[var(--surface)] transition-colors",
              manualDiscountApplied
                ? "border-emerald-300 dark:border-emerald-800"
                : "border-[var(--border)]"
            )}
          >
            <DiscountTypeToggle
              value={billDiscountType}
              currencySymbol={currencySymbol}
              disabled={disabled}
              onChange={onTypeChange}
            />
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder={effectiveType === "PERCENT" ? t("percentPlaceholder") : t("amountPlaceholder")}
              value={billDiscountValue}
              onChange={(e) => onValueChange(e.target.value)}
              className={cn(
                inputClass,
                "flex-1 min-w-0 border-0 bg-transparent py-2 px-1 shadow-none focus:ring-0 rounded-none",
                manualDiscountApplied && "font-semibold text-emerald-900 dark:text-emerald-100"
              )}
              disabled={disabled}
              aria-label={t("manualDiscount")}
            />
            {manualDiscountApplied ? (
              <button
                type="button"
                onClick={onClearManualDiscount}
                disabled={disabled || applyPending}
                className="inline-flex shrink-0 min-h-9 min-w-9 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-emerald-700 touch-manipulation mr-0.5"
                aria-label={t("clearDiscount")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block min-w-0 space-y-1">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{t("couponLabel")}</span>
          <select
            value={selectedCouponId}
            onChange={(e) => onCouponChange(e.target.value)}
            className={selectClass}
            disabled={disabled || manualDiscountApplied}
          >
            <option value="">{t("noCoupon")}</option>
            {coupons.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name} (
                {c.discountType === "PERCENT" ? `${c.discountValue}%` : formatCurrency(c.discountValue, localeKit)})
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 space-y-1">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{t("offerLabel")}</span>
          <select
            value={selectedOfferId}
            onChange={(e) => onOfferChange(e.target.value)}
            className={selectClass}
            disabled={disabled || !!selectedCouponId || manualDiscountApplied}
          >
            <option value="">{t("noOffer")}</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} (
                {o.discountType === "PERCENT" ? `${o.discountValue}%` : formatCurrency(o.discountValue, localeKit)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{t("xorHint")}</p>
    </div>
  );
}
