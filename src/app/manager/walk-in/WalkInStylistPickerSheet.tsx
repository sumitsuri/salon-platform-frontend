"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BranchServiceItem, StaffItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";

type Props = {
  open: boolean;
  service: BranchServiceItem | null;
  staff: StaffItem[];
  onPickStaff: (staffId: string) => void;
  onClose: () => void;
  localeKit: TenantLocaleKit;
  /** When adding another unit of the same service (1-based). */
  unitNumber?: number;
  variant?: "add" | "change";
};

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function WalkInStylistPickerSheet({
  open,
  service,
  staff,
  onPickStaff,
  onClose,
  localeKit,
  unitNumber,
  variant = "add",
}: Props) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");
  const mounted = useIsMounted();

  useScrollLock(open);

  if (!open || !service || !mounted) return null;

  const priceLabel = service.variablePricing
    ? t("priceFrom", { price: formatCurrency(service.price, localeKit) })
    : formatCurrency(service.price, localeKit);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/45"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex w-full max-h-[min(72dvh,560px)] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl sm:border sm:mb-4"
        role="dialog"
        aria-modal="true"
        aria-label={t("stylistPickerTitle")}
        data-testid="walk-in-stylist-picker"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base text-[var(--text-primary)]">{t("stylistPickerTitle")}</h2>
            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
              {service.serviceName}
              {unitNumber != null && unitNumber > 0
                ? ` · ${t("stylistPickerUnit", { unit: unitNumber })}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-[var(--surface-muted)] touch-manipulation shrink-0"
            aria-label={tCommon("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div
          className="overflow-y-auto overscroll-contain touch-scroll-y px-4 py-3 max-h-[min(52dvh,420px)]"
          data-touch-scroll
        >
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
            {variant === "change" ? t("stylistPickerChangeHint") : t("stylistPickerHint")}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
            {[service.durationMinutes ? `${service.durationMinutes}m` : null, priceLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <ul className="flex flex-col gap-2 pb-1" role="list">
            {staff.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  data-testid={`walk-in-stylist-option-${member.id}`}
                  onClick={() => onPickStaff(member.id)}
                  className={cn(
                    "flex w-full items-center rounded-xl border border-[var(--border)] px-4 py-3 min-h-[3rem] text-left touch-manipulation transition",
                    "hover:border-[var(--brand)]/50 hover:bg-[var(--brand-light)]/25 active:scale-[0.99]",
                  )}
                >
                  <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{member.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
