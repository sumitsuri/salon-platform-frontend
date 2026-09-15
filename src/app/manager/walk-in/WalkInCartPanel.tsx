"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillPreview, StaffItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatMoney, cn } from "@/lib/utils";
import { Card, btnPrimary, btnSecondary } from "@/components/ui";
import { WalkInCartItem, walkInCartLinePrice, walkInCartServiceCount, walkInCartStaffSlots, walkInCartItemQty } from "./walk-in-types";
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
  onEditPrice: (idx: number) => void;
  onDecreasePaidUnit?: (idx: number) => void;
  onAddPaidUnit?: (idx: number) => void;
  onDecreasePackageUnit?: (idx: number) => void;
  onAddPackageUnit?: (idx: number) => void;
  onEditStaffSlot?: (idx: number, unitIndex: number) => void;
  /** Cart line awaiting stylist pick after + (inline, no full-screen gap). */
  inlineStylistPick?: { cartIdx: number; unitIndex?: number } | null;
  onPickInlineStylist?: (staffId: string) => void;
  onCancelInlineStylistPick?: () => void;
  maxPackageLineQty?: (item: WalkInCartItem) => number;
  maxPaidLineQty?: (item: WalkInCartItem) => number;
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
  onEditPrice,
  onDecreasePaidUnit,
  onAddPaidUnit,
  onDecreasePackageUnit,
  onAddPackageUnit,
  onEditStaffSlot,
  inlineStylistPick,
  onPickInlineStylist,
  onCancelInlineStylistPick,
  maxPackageLineQty,
  maxPaidLineQty,
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

  const cartCount = walkInCartServiceCount(cart);

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="ui-field-label">
          {t("cart", { count: cartCount })}
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
              "space-y-2 overscroll-contain touch-scroll-y",
              variant === "panel"
                ? "max-h-[min(50vh,24rem)] overflow-y-auto"
                : "overflow-visible"
            )}
            data-testid="walk-in-cart"
            {...(variant === "panel" ? { "data-touch-scroll": true } : {})}
          >
            {cart.map((item, idx) => (
              <div key={idx} className="p-3 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)]">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-sm min-w-0 truncate">
                    {item.serviceName}
                    {(item.quantity ?? 1) > 1 ? ` × ${item.quantity ?? 1}` : ""}
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
                {item.packageSubscriptionId && onDecreasePackageUnit && onAddPackageUnit && maxPackageLineQty ? (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">{t("packageRedeemQtyLabel")}</span>
                    <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)]">
                      <button
                        type="button"
                        className="px-2.5 py-1.5 font-medium touch-manipulation disabled:opacity-40"
                        disabled={walkInCartItemQty(item) <= 1}
                        aria-label={t("packageCartQtyDecrease")}
                        onClick={() => onDecreasePackageUnit(idx)}
                      >
                        −
                      </button>
                      <span className="min-w-[1.75rem] px-1 text-center tabular-nums font-semibold">
                        {walkInCartItemQty(item)}
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 font-medium touch-manipulation disabled:opacity-40"
                        disabled={walkInCartItemQty(item) >= maxPackageLineQty(item)}
                        aria-label={t("serviceCartQtyIncrease")}
                        onClick={() => onAddPackageUnit(idx)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
                {!item.packageSubscriptionId && onDecreasePaidUnit && onAddPaidUnit && maxPaidLineQty ? (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">{t("serviceQtyLabel")}</span>
                    <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)]">
                      <button
                        type="button"
                        className="px-2.5 py-1.5 font-medium touch-manipulation disabled:opacity-40"
                        disabled={walkInCartItemQty(item) <= 1}
                        aria-label={t("serviceCartQtyDecrease")}
                        onClick={() => onDecreasePaidUnit(idx)}
                      >
                        −
                      </button>
                      <span className="min-w-[1.75rem] px-1 text-center tabular-nums font-semibold">
                        {walkInCartItemQty(item)}
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 font-medium touch-manipulation disabled:opacity-40"
                        disabled={walkInCartItemQty(item) >= maxPaidLineQty(item)}
                        aria-label={t("serviceCartQtyIncrease")}
                        onClick={() => onAddPaidUnit(idx)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
                {staff.length > 0 && onEditStaffSlot ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {walkInCartStaffSlots(item).map((slotStaffId, unitIndex) => {
                      const qty = walkInCartItemQty(item);
                      const name = staff.find((st) => st.id === slotStaffId)?.name;
                      const isActivePick =
                        inlineStylistPick?.cartIdx === idx &&
                        inlineStylistPick.unitIndex === unitIndex;
                      return (
                        <button
                          key={unitIndex}
                          type="button"
                          onClick={() => onEditStaffSlot(idx, unitIndex)}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium touch-manipulation",
                            isActivePick
                              ? "border-[var(--brand)] bg-[var(--brand-light)]/50 text-[var(--brand-text)]"
                              : slotStaffId
                                ? "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand)]/50"
                                : "border-amber-300 bg-amber-50/90 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                          )}
                        >
                          {qty > 1 ? (
                            <span className="font-bold tabular-nums">{unitIndex + 1}.</span>
                          ) : null}
                          <span className="truncate">{name ?? t("tapToPickStylist")}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {inlineStylistPick?.cartIdx === idx &&
                onPickInlineStylist &&
                onCancelInlineStylistPick ? (
                  <div className="mt-2 rounded-xl border border-[var(--brand)]/35 bg-[var(--brand-light)]/25 p-2.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                        {inlineStylistPick.unitIndex != null
                          ? t("stylistPickerChangeHint")
                          : t("stylistPickerHint")}
                      </p>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[var(--text-tertiary)] touch-manipulation shrink-0"
                        onClick={onCancelInlineStylistPick}
                      >
                        {tCommon("cancel")}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          data-testid={`walk-in-inline-stylist-${st.id}`}
                          onClick={() => onPickInlineStylist(st.id)}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] touch-manipulation hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/30"
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            {staff.length > 0 && !inlineStylistPick && (
              <p className="text-[11px] text-[var(--text-tertiary)]">{t("stylistPickerOnPlusHint")}</p>
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
