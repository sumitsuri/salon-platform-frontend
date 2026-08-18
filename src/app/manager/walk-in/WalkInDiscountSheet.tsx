"use client";

import { CheckCircle2, Tag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApplicablePromo } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency } from "@/lib/utils";
import { btnPrimary } from "@/components/ui";
import { WalkInBottomSheet } from "./WalkInBottomSheet";
import { WalkInPromoAdjustments } from "./WalkInPromoAdjustments";

type DiscountKind = "" | "FLAT" | "PERCENT";

interface WalkInDiscountSheetProps {
  open: boolean;
  onClose: () => void;
  applySuccess?: boolean;
  successAmount?: number;
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
  applyPending?: boolean;
  onCouponChange: (id: string) => void;
  onOfferChange: (id: string) => void;
  onBillDiscountTypeChange: (v: DiscountKind) => void;
  onBillDiscountValueChange: (v: string) => void;
  onClearManualDiscount: () => void;
}

function DiscountSuccessView({
  localeKit,
  successAmount,
  onClose,
}: {
  localeKit: TenantLocaleKit;
  successAmount?: number;
  onClose: () => void;
}) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
      </div>
      <p className="text-lg font-bold text-[var(--text-primary)]">{t("discountAppliedSuccess")}</p>
      {(successAmount ?? 0) > 0 ? (
        <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          -{formatCurrency(successAmount ?? 0, localeKit)}
        </p>
      ) : null}
      <p className="mt-2 max-w-xs text-xs text-[var(--text-secondary)] leading-snug">{t("discountAppliedSuccessHint")}</p>
      <button type="button" onClick={onClose} className={`${btnPrimary} mt-6 w-full min-h-11`}>
        {tCommon("done")}
      </button>
    </div>
  );
}

function DiscountSheetBody({
  applySuccess,
  successAmount,
  onClose,
  localeKit,
  ...props
}: Omit<WalkInDiscountSheetProps, "open">) {
  const t = useTranslations("manager.walkIn");

  if (applySuccess) {
    return <DiscountSuccessView localeKit={localeKit} successAmount={successAmount} onClose={onClose} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/40 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <Tag className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <p className="text-xs text-[var(--text-secondary)] leading-snug">{t("discountSheetHint")}</p>
      </div>
      <WalkInPromoAdjustments {...props} localeKit={localeKit} />
    </div>
  );
}

export function WalkInDiscountSheet({
  open,
  onClose,
  applySuccess,
  successAmount,
  localeKit,
  ...props
}: WalkInDiscountSheetProps) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  if (!open) return null;

  const title = applySuccess ? t("discountAppliedTitle") : t("discountSheetTitle");

  return (
    <>
      <div className="hidden lg:block">
        <button type="button" className="fixed inset-0 z-[140] bg-black/45" aria-label={tCommon("close")} onClick={onClose} />
        <div
          className="fixed left-1/2 top-1/2 z-[150] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl max-h-[min(88vh,720px)] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="font-bold text-[var(--text-primary)]">{title}</p>
            {!applySuccess ? (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--surface-muted)] touch-manipulation"
                aria-label={tCommon("close")}
              >
                <X className="w-5 h-5" />
              </button>
            ) : null}
          </div>
          <DiscountSheetBody
            applySuccess={applySuccess}
            successAmount={successAmount}
            onClose={onClose}
            localeKit={localeKit}
            {...props}
          />
        </div>
      </div>
      <div className="lg:hidden">
        <WalkInBottomSheet open={open} title={title} onClose={onClose}>
          <DiscountSheetBody
            applySuccess={applySuccess}
            successAmount={successAmount}
            onClose={onClose}
            localeKit={localeKit}
            {...props}
          />
        </WalkInBottomSheet>
      </div>
    </>
  );
}
