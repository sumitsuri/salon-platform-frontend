"use client";

import { ChevronDown, Gift, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ServicePackagePlan, StaffItem } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { packageSavingsLabel } from "@/lib/package-inclusions";
import { btnSecondarySm, selectClass } from "@/components/ui";

type Props = {
  plan: ServicePackagePlan | null;
  planId: string;
  onClear: () => void;
  staff: StaffItem[];
  soldByStaffId: string;
  onSoldByStaffChange: (staffId: string) => void;
  disabled?: boolean;
  /** @deprecated All surfaces use collapsible summary; kept for call-site compatibility */
  compact?: boolean;
};

export function WalkInPendingPackageSaleBanner({
  plan,
  planId,
  onClear,
  staff,
  soldByStaffId,
  onSoldByStaffChange,
  disabled,
}: Props) {
  const t = useTranslations("manager.walkIn");
  if (!planId) return null;

  const label = plan?.name ?? t("packageSelectedLoading");
  const price = plan?.packagePrice;
  const savings = plan ? packageSavingsLabel(plan) : null;
  const items = plan?.items ?? [];
  const summaryLine = [
    plan?.predefinedRank ? `#${plan.predefinedRank} · ` : "",
    label,
    price != null ? ` · ${formatCurrency(price)}` : "",
  ].join("");
  const sellerName = staff.find((s) => s.id === soldByStaffId)?.name;

  return (
    <details
      className={cn(
        "group min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm",
        "open:border-sky-300/60 dark:open:border-sky-800/50"
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 touch-manipulation [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
          <Gift className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate ui-card-title">{t("packageSelectedCollapsed")}</p>
          <p className="truncate text-[11px] leading-snug text-[var(--text-secondary)]">{summaryLine}</p>
          {sellerName ? (
            <p className="truncate text-[10px] text-[var(--text-tertiary)] mt-0.5">
              {t("packageSoldByShort", { name: sellerName })}
            </p>
          ) : staff.length > 0 ? (
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
              {t("packageSoldByRequired")}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition group-open:rotate-180"
          aria-hidden
        />
        <button
          type="button"
          className={cn(btnSecondarySm, "shrink-0")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          aria-label={t("packageClearSelection")}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </summary>

      <div
        className="space-y-2 border-t border-[var(--border)] px-3 py-2.5 text-xs text-[var(--text-primary)]"
        role="status"
      >
        {staff.length > 0 ? (
          <label className="block">
            <span className="ui-field-label block mb-1">{t("packageSoldByStaffLabel")}</span>
            <select
              className={cn(selectClass, "min-h-11 py-2.5")}
              value={soldByStaffId}
              disabled={disabled}
              onChange={(e) => onSoldByStaffChange(e.target.value)}
              aria-required
            >
              <option value="">{t("selectStylist")}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-amber-800 dark:text-amber-200">{t("noStaffConfigured")}</p>
        )}

        <p className="font-semibold text-[var(--text-secondary)]">{t("packageSelectedTitle")}</p>
        {items.length > 0 ? (
          <div>
            <p className="font-medium text-[var(--text-secondary)]">{t("packageIncludes")}</p>
            <ul className="mt-1 space-y-0.5">
              {items.map((item) => (
                <li key={`${item.serviceId}-${item.sortOrder ?? 0}`} className="break-words">
                  {item.serviceName || "Service"}
                  {item.quantity > 1 ? ` · ${item.quantity}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {savings ? (
          <p className="text-[11px] text-sky-900/80 dark:text-sky-200/80">
            {t("packagePrepaidValue", { save: savings })}
          </p>
        ) : null}
        <p className="text-[11px] text-[var(--text-tertiary)]">{t("packageSelectedSub")}</p>
      </div>
    </details>
  );
}
