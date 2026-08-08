"use client";

import { useTranslations } from "next-intl";
import { ApplicablePromo } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency } from "@/lib/utils";
import { inputClass, selectClass, btnSecondary } from "@/components/ui";

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
  manualDiscountActive: boolean;
  disabled?: boolean;
  onCouponChange: (id: string) => void;
  onOfferChange: (id: string) => void;
  onBillDiscountTypeChange: (v: DiscountKind) => void;
  onBillDiscountValueChange: (v: string) => void;
  onApplyManualDiscount: () => void;
  onClearManualDiscount: () => void;
  applyPending?: boolean;
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
  manualDiscountActive,
  disabled,
  onCouponChange,
  onOfferChange,
  onBillDiscountTypeChange,
  onBillDiscountValueChange,
  onApplyManualDiscount,
  onClearManualDiscount,
  applyPending,
}: WalkInPromoAdjustmentsProps) {
  const t = useTranslations("manager.walkIn");

  return (
    <div className="space-y-3">
      <select
        value={selectedCouponId}
        onChange={(e) => onCouponChange(e.target.value)}
        className={selectClass}
        disabled={disabled || manualDiscountActive}
      >
        <option value="">{t("noCoupon")}</option>
        {coupons.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} · {c.name} (
            {c.discountType === "PERCENT" ? `${c.discountValue}%` : formatCurrency(c.discountValue, localeKit)})
          </option>
        ))}
      </select>
      <select
        value={selectedOfferId}
        onChange={(e) => onOfferChange(e.target.value)}
        className={selectClass}
        disabled={disabled || !!selectedCouponId || manualDiscountActive}
      >
        <option value="">{t("noOffer")}</option>
        {offers.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} (
            {o.discountType === "PERCENT" ? `${o.discountValue}%` : formatCurrency(o.discountValue, localeKit)})
          </option>
        ))}
      </select>
      <p className="text-xs text-[var(--text-tertiary)]">{t("xorHint")}</p>

      <div className={promoLocked ? "opacity-60 space-y-2" : "space-y-2 pt-2 border-t border-[var(--border)]"}>
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {t("manualDiscount")}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">{t("manualDiscountHint")}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={billDiscountType}
            onChange={(e) => onBillDiscountTypeChange(e.target.value as DiscountKind)}
            className={selectClass}
            disabled={disabled || promoLocked}
          >
            <option value="">{t("noManualDiscount")}</option>
            <option value="PERCENT">{t("percentOff")}</option>
            <option value="FLAT">{t("flatOff")}</option>
          </select>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder={billDiscountType === "PERCENT" ? t("percentPlaceholder") : t("amountPlaceholder")}
            value={billDiscountValue}
            onChange={(e) => onBillDiscountValueChange(e.target.value)}
            className={inputClass}
            disabled={disabled || promoLocked || !billDiscountType}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApplyManualDiscount}
            disabled={disabled || promoLocked || !billDiscountType || applyPending}
            className={`${btnSecondary} flex-1 min-h-11`}
          >
            {t("applyManualDiscount")}
          </button>
          {manualDiscountActive && (
            <button type="button" onClick={onClearManualDiscount} className={`${btnSecondary} min-h-11`}>
              {t("clearDiscount")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
