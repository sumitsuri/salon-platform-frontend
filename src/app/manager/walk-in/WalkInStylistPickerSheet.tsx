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
      className="fixed inset-0 z-[200] flex flex-col bg-[var(--surface)] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t("stylistPickerTitle")}
      data-testid="walk-in-stylist-picker-fullscreen"
    >
      <header
        className="shrink-0 flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-base text-[var(--text-primary)]">{t("stylistPickerTitle")}</h2>
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{service.serviceName}</p>
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
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll-y px-4 py-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
        data-touch-scroll
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 mb-4">
          <p className="font-bold text-sm text-[var(--text-primary)] leading-snug">{service.serviceName}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {[service.durationMinutes ? `${service.durationMinutes}m` : null, priceLabel].filter(Boolean).join(" · ")}
          </p>
        </div>

        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">{t("stylistPickerHint")}</p>

        <ul className="space-y-2 pb-4" role="list">
          {staff.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                data-testid={`walk-in-stylist-option-${member.id}`}
                onClick={() => onPickStaff(member.id)}
                className={cn(
                  "flex w-full items-center rounded-xl border border-[var(--border)] px-4 py-4 min-h-[3.5rem] text-left touch-manipulation transition",
                  "hover:border-[var(--brand)]/50 hover:bg-[var(--brand-light)]/25 active:scale-[0.99]",
                )}
              >
                <span className="font-semibold text-base text-[var(--text-primary)] truncate">{member.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
