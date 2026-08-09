"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillPreview, StaffItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, formatMoney, cn } from "@/lib/utils";
import { Card, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/ui";
import { WalkInCartItem, walkInCartLinePrice } from "./walk-in-types";

interface WalkInCartPanelProps {
  cart: WalkInCartItem[];
  staff: StaffItem[];
  localeKit: TenantLocaleKit;
  estimatedGrand: number;
  cartHasFreshBill: boolean;
  billPreview: BillPreview | null;
  saving: boolean;
  stylistsRequired: boolean;
  stylistsComplete: boolean;
  onRemove: (idx: number) => void;
  onUpdateStaff: (idx: number, staffId: string) => void;
  onApplyStylistToAll: (staffId: string) => void;
  onUpdatePriceExtra: (idx: number, raw: string) => void;
  onSaveOpen: () => void;
  onProceedToBill: () => void;
  variant: "panel" | "sheet" | "dock-summary";
  showActions?: boolean;
}

export function WalkInCartPanel({
  cart,
  staff,
  localeKit,
  estimatedGrand,
  cartHasFreshBill,
  billPreview,
  saving,
  stylistsRequired,
  stylistsComplete,
  onRemove,
  onUpdateStaff,
  onApplyStylistToAll,
  onUpdatePriceExtra,
  onSaveOpen,
  onProceedToBill,
  variant,
  showActions = true,
}: WalkInCartPanelProps) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  const totalDisplay = formatMoney(
    cartHasFreshBill && billPreview ? billPreview.grandTotal : estimatedGrand,
    localeKit
  );

  if (variant === "dock-summary") {
    return null;
  }

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {t("cart", { count: cart.length })}
        </p>
        <div className="text-right min-w-0">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
            {cartHasFreshBill ? t("billTotal") : t("estimatedTotal")}
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums truncate">{totalDisplay}</p>
        </div>
      </div>

      {cart.length === 0 ? (
        <p className="text-[var(--text-tertiary)] text-sm text-center py-4">{t("cartEmpty")}</p>
      ) : (
        <>
          {staff.length > 0 && (
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">{t("sameStylistForAll")}</span>
              <select
                className={`${selectClass} mt-1 py-2.5 min-h-11`}
                value=""
                onChange={(e) => {
                  if (e.target.value) onApplyStylistToAll(e.target.value);
                }}
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

          <div
            className={cn(
              "space-y-2 overflow-y-auto overscroll-contain",
              variant === "panel" ? "max-h-[min(50vh,24rem)]" : "max-h-[min(45vh,20rem)]"
            )}
            data-testid="walk-in-cart"
          >
            {cart.map((item, idx) => (
              <div key={idx} className="p-3 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)]">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-sm min-w-0 truncate">{item.serviceName}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-[var(--brand-text)] tabular-nums">
                      {formatCurrency(walkInCartLinePrice(item), localeKit)}
                    </span>
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
                {item.variablePricing && (
                  <label className="mt-2 block text-xs text-[var(--text-secondary)]">
                    {t("priceExtra")}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={item.priceExtra || ""}
                      onChange={(e) => onUpdatePriceExtra(idx, e.target.value)}
                      className={`${inputClass} mt-1 py-2 min-h-10`}
                      placeholder="0"
                    />
                  </label>
                )}
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
        </>
      )}

      {showActions && (
        <>
          {stylistsRequired && !stylistsComplete && cart.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("assignStylistError")}</p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onProceedToBill}
              disabled={cart.length === 0 || saving || (stylistsRequired && !stylistsComplete)}
              className={`${btnPrimary} w-full min-h-12`}
            >
              {saving ? tCommon("processing") : t("continueBill")}
            </button>
            <button
              type="button"
              onClick={onSaveOpen}
              disabled={cart.length === 0 || saving}
              className={`${btnSecondary} w-full min-h-11`}
            >
              {saving ? tCommon("processing") : t("saveOpenVisit")}
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] text-center">{t("saveOpenVisitHint")}</p>
        </>
      )}
    </>
  );

  if (variant === "sheet") {
    return <div className="space-y-3 px-1">{inner}</div>;
  }

  return (
    <Card className="space-y-3 sticky top-4 max-h-[calc(100dvh-6rem)] overflow-hidden flex flex-col">
      <div className="overflow-y-auto overscroll-contain space-y-3 min-h-0 flex-1">{inner}</div>
    </Card>
  );
}
