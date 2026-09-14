"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillPreview, StaffItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatMoney, cn } from "@/lib/utils";
import { Card, selectClass, btnPrimary, btnSecondary } from "@/components/ui";
import { WalkInCartItem, walkInCartLinePrice } from "./walk-in-types";
import { WalkInEditablePriceButton } from "./WalkInEditablePriceButton";
import { WalkInMobileCartActions } from "./WalkInMobileCartActions";

interface WalkInCartPanelProps {
  cart: WalkInCartItem[];
  staff: StaffItem[];
  localeKit: TenantLocaleKit;
  cartSubtotal: number;
  estimatedCgst: number;
  estimatedSgst: number;
  estimatedGrand: number;
  gstEffective: boolean;
  cartHasFreshBill: boolean;
  billPreview: BillPreview | null;
  saving: boolean;
  stylistsRequired: boolean;
  stylistsComplete: boolean;
  pendingPackagePlanName?: string;
  pendingPackagePlanPrice?: number;
  pendingPackageInclusions?: string;
  onRemove: (idx: number) => void;
  onUpdateStaff: (idx: number, staffId: string) => void;
  onEditPrice: (idx: number) => void;
  onUpdatePackageQuantity?: (idx: number, quantity: number) => void;
  maxPackageLineQty?: (item: WalkInCartItem) => number;
  onSaveOpen: () => void;
  onProceedToBill: () => void;
  variant: "panel" | "sheet" | "dock-summary";
  showActions?: boolean;
}

export function WalkInCartPanel({
  cart,
  staff,
  localeKit,
  cartSubtotal,
  estimatedCgst,
  estimatedSgst,
  estimatedGrand,
  gstEffective,
  cartHasFreshBill,
  billPreview,
  saving,
  stylistsRequired,
  stylistsComplete,
  pendingPackagePlanName,
  pendingPackagePlanPrice,
  pendingPackageInclusions,
  onRemove,
  onUpdateStaff,
  onEditPrice,
  onUpdatePackageQuantity,
  maxPackageLineQty,
  onSaveOpen,
  onProceedToBill,
  variant,
  showActions = true,
}: WalkInCartPanelProps) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  const useBillPreview = cartHasFreshBill && billPreview && gstEffective;
  const servicesBase = useBillPreview
    ? (billPreview.taxableAmount ?? billPreview.subtotal)
    : cartSubtotal;
  const cgst = useBillPreview ? billPreview.cgstAmount : estimatedCgst;
  const sgst = useBillPreview ? (billPreview.sgstAmount ?? 0) : estimatedSgst;
  const grand = useBillPreview ? billPreview.grandTotal : estimatedGrand;
  const gstTotal = cgst + sgst;

  const totalDisplay = formatMoney(grand, localeKit);
  const hasPackageSale = !!(pendingPackagePlanName && pendingPackagePlanPrice != null);
  const canProceed = cart.length > 0 || hasPackageSale;
  const canSaveOpen = cart.length > 0 || hasPackageSale;
  const packageOnlyGrand = hasPackageSale ? pendingPackagePlanPrice! : grand;
  const displayGrand = cart.length === 0 && hasPackageSale ? packageOnlyGrand : grand;
  const displayGrandFormatted = formatMoney(displayGrand, localeKit);

  if (variant === "dock-summary") {
    return null;
  }

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="ui-field-label">
          {t("cart", { count: cart.length })}
        </p>
        {cart.length > 0 && (
          <div className="text-right min-w-0">
            <p className="ui-field-label">
              {useBillPreview ? t("billTotal") : t("estimatedTotal")}
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)] tabular-nums truncate">{totalDisplay}</p>
          </div>
        )}
      </div>

      {cart.length === 0 && !hasPackageSale ? (
        <p className="text-[var(--text-tertiary)] text-sm text-center py-4">{t("cartEmpty")}</p>
      ) : cart.length === 0 && hasPackageSale ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/30">
          <p className="font-medium text-[var(--text-primary)]">{pendingPackagePlanName}</p>
          {pendingPackageInclusions ? (
            <p className="text-xs text-[var(--text-secondary)] mt-1 break-words whitespace-normal">
              {t("packageIncludes")} {pendingPackageInclusions}
            </p>
          ) : null}
          <p className="text-[var(--text-secondary)] mt-1">{t("cartPackageOnlyHint")}</p>
          <p className="mt-2 font-semibold tabular-nums text-[var(--brand-text)]">
            {formatMoney(pendingPackagePlanPrice!, localeKit)}
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "space-y-2 overflow-y-auto overscroll-contain touch-scroll-y",
              variant === "panel" ? "max-h-[min(50vh,24rem)]" : "max-h-[min(45vh,20rem)]"
            )}
            data-testid="walk-in-cart"
            data-touch-scroll
          >
            {cart.map((item, idx) => (
              <div key={idx} className="p-3 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)]">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-sm min-w-0 truncate">
                    {item.serviceName}
                    {item.packageSubscriptionId && (item.quantity ?? 1) > 1
                      ? ` × ${item.quantity ?? 1}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {!item.packageSubscriptionId ? (
                      <WalkInEditablePriceButton
                        amount={walkInCartLinePrice(item)}
                        localeKit={localeKit}
                        onEdit={() => onEditPrice(idx)}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-sky-800 dark:text-sky-200 tabular-nums">
                        {formatMoney(0, localeKit)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="text-[var(--text-tertiary)] hover:text-red-500 p-1.5 -m-1 touch-manipulation"
                      aria-label={tCommon("remove")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {item.packageSubscriptionId && onUpdatePackageQuantity && maxPackageLineQty ? (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">{t("packageRedeemQtyLabel")}</span>
                    <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)]">
                      <button
                        type="button"
                        className="px-2.5 py-1.5 font-medium touch-manipulation disabled:opacity-40"
                        disabled={(item.quantity ?? 1) <= 1}
                        aria-label={t("packageCartQtyDecrease")}
                        onClick={() =>
                          onUpdatePackageQuantity(idx, Math.max(1, (item.quantity ?? 1) - 1))
                        }
                      >
                        −
                      </button>
                      <span className="min-w-[1.75rem] px-1 text-center tabular-nums font-semibold">
                        {item.quantity ?? 1}
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 font-medium touch-manipulation disabled:opacity-40"
                        disabled={(item.quantity ?? 1) >= maxPackageLineQty(item)}
                        aria-label={t("packageCartQtyIncrease")}
                        onClick={() =>
                          onUpdatePackageQuantity(
                            idx,
                            Math.min(maxPackageLineQty(item), (item.quantity ?? 1) + 1)
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
                {staff.length > 0 && (
                  <label className="mt-2 block text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">{t("stylistPerService")}</span>
                    <select
                      data-testid="walk-in-stylist-select"
                      value={item.staffId}
                      onChange={(e) => onUpdateStaff(idx, e.target.value)}
                      className={`${selectClass} mt-1 py-2.5 min-h-11`}
                    >
                      <option value="">{t("selectStylist")}</option>
                      {staff.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ))}
            {staff.length > 0 && (
              <p className="text-[11px] text-[var(--text-tertiary)]">{t("stylistAutoAssigned")}</p>
            )}
          </div>

          {cart.length > 0 && gstEffective && gstTotal > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 space-y-1.5 text-sm">
              <p className="text-[10px] text-[var(--text-tertiary)] leading-snug">{t("cartPricesExcludeGst")}</p>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-secondary)]">{t("cartServicesSubtotal")}</span>
                <span className="tabular-nums font-medium">{formatMoney(servicesBase, localeKit)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-secondary)]">{t("cartGstEstimated")}</span>
                <span className="tabular-nums font-medium">{formatMoney(gstTotal, localeKit)}</span>
              </div>
              <div className="flex justify-between gap-2 pt-1.5 border-t border-[var(--border)] font-bold">
                <span className="text-[var(--text-primary)]">
                  {useBillPreview ? t("billTotal") : t("estimatedTotal")}
                </span>
                <span className="tabular-nums text-[var(--brand-text)]">{totalDisplay}</span>
              </div>
            </div>
          )}
        </>
      )}

      {showActions && (
        <>
          {stylistsRequired && !stylistsComplete && cart.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("assignStylistError")}</p>
          )}
          {variant === "sheet" ? (
            <div className="pt-1">
              <WalkInMobileCartActions
                saving={saving}
                proceedDisabled={!canProceed || saving || (cart.length > 0 && stylistsRequired && !stylistsComplete)}
                saveDisabled={!canSaveOpen || saving || (cart.length > 0 && staff.length === 0)}
                onProceed={onProceedToBill}
                onSave={onSaveOpen}
              />
              <p className="mt-1.5 text-center text-[10px] text-[var(--text-tertiary)] leading-snug">
                {t("mobileSaveVisitHint")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={onProceedToBill}
                disabled={!canProceed || saving || (cart.length > 0 && stylistsRequired && !stylistsComplete)}
                className={`${btnPrimary} w-full min-h-12`}
              >
                {saving ? tCommon("processing") : t("continueBill")}
              </button>
              <button
                type="button"
                onClick={onSaveOpen}
                disabled={!canSaveOpen || saving || (cart.length > 0 && staff.length === 0)}
                className={`${btnSecondary} w-full min-h-11`}
              >
                {saving ? tCommon("processing") : t("saveOpenVisit")}
              </button>
              <p className="text-[11px] text-[var(--text-tertiary)] text-center">{t("saveOpenVisitHint")}</p>
            </div>
          )}
        </>
      )}
    </>
  );

  if (variant === "sheet") {
    return <div className="space-y-3 px-1">{inner}</div>;
  }

  return (
    <Card className="space-y-3 sticky top-4 max-h-[calc(100dvh-6rem)] overflow-hidden flex flex-col">
      <div className="overflow-y-auto overscroll-contain touch-scroll-y space-y-3 min-h-0 flex-1" data-touch-scroll>{inner}</div>
    </Card>
  );
}
