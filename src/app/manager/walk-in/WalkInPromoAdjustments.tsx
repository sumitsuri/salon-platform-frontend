"use client";

import { CheckCircle2, X } from "lucide-react";
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
        "inline-flex shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-0.5",
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
            "min-h-10 min-w-[2.75rem] rounded-md px-2.5 text-xs font-bold transition touch-manipulation",
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
  manualDiscountLabel,
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

  const appliedSummary =
    manualDiscountLabel ||
    billPreviewLabel(billDiscountType, billDiscountValue, currencySymbol);

  return (
    <div className="space-y-3">
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

      <div
        className={cn(
          "rounded-xl border p-3 space-y-2.5 transition-colors",
          manualDiscountApplied
            ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/80 shadow-sm ring-2 ring-emerald-200/70 dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/20 dark:ring-emerald-900/50"
            : "border-[var(--border)] bg-[var(--surface-muted)]/30"
        )}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            {manualDiscountApplied ? (
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5"
                aria-hidden
              />
            ) : null}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-bold",
                  manualDiscountApplied
                    ? "text-emerald-900 dark:text-emerald-100"
                    : "text-[var(--text-primary)]"
                )}
              >
                {t("manualDiscount")}
              </p>
              {!manualDiscountApplied && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-snug">
                  {t("manualDiscountHint")}
                </p>
              )}
              {manualDiscountApplied && appliedSummary && (
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mt-0.5">
                  {appliedSummary}
                  {(manualDiscountAmount ?? 0) > 0 && (
                    <span className="font-bold tabular-nums">
                      {" "}
                      · -{formatCurrency(manualDiscountAmount ?? 0, localeKit)}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          {manualDiscountApplied && appliedSummary && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {t("manualDiscountAppliedBadge")}
            </span>
          )}
        </div>

        {promoLocked ? (
          <p className="text-xs text-[var(--text-tertiary)] rounded-lg bg-[var(--surface)]/80 px-2.5 py-2 border border-[var(--border)]">
            {t("promoBlocksManual")}
          </p>
        ) : (
          <div
            className={cn(
              "flex items-center gap-2 min-w-0 rounded-lg p-2",
              manualDiscountApplied && "bg-white/70 dark:bg-black/20 border border-emerald-200/80 dark:border-emerald-800/60"
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
                "flex-1 min-w-0 py-2.5",
                manualDiscountApplied &&
                  "border-emerald-300 bg-white font-semibold text-emerald-900 focus:ring-emerald-300 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100"
              )}
              disabled={disabled}
              aria-label={t("manualDiscount")}
            />
            {manualDiscountApplied && (
              <button
                type="button"
                onClick={onClearManualDiscount}
                disabled={disabled || applyPending}
                className="inline-flex shrink-0 min-h-10 min-w-10 items-center justify-center rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 touch-manipulation"
                aria-label={t("clearDiscount")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {applyPending && (
          <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">{t("discountUpdating")}</p>
        )}
      </div>
    </div>
  );
}

function billPreviewLabel(type: DiscountKind, value: string, currencySymbol: string): string | null {
  const num = Number(value);
  if (!type || !Number.isFinite(num) || num <= 0) return null;
  return type === "PERCENT" ? `${num}% off` : `${currencySymbol}${num} off`;
}
