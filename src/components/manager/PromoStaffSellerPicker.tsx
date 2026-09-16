"use client";

import { useTranslations } from "next-intl";
import { StaffItem } from "@/lib/api";
import {
  STAFF_MEMBERSHIP_SALE_INCENTIVE_INR,
  STAFF_PACKAGE_SALE_INCENTIVE_PERCENT,
  packageSaleIncentiveFromAmount,
} from "@/lib/manager-home-sell-incentives";
import { cn, formatCurrency } from "@/lib/utils";
import { selectClass } from "@/components/ui";

type Props = {
  staff: StaffItem[];
  value: string;
  onChange: (staffId: string) => void;
  disabled?: boolean;
  kind?: "membership" | "package";
  variant?: "chips" | "select";
  /** Used for package % incentive hint when kind is package. */
  packageSaleAmount?: number;
};

export function PromoStaffSellerPicker({
  staff,
  value,
  onChange,
  disabled,
  kind = "membership",
  variant = "chips",
  packageSaleAmount,
}: Props) {
  const t = useTranslations("manager.memberships");
  const tWalkIn = useTranslations("manager.walkIn");
  if (staff.length === 0) {
    return <p className="text-sm text-amber-700 dark:text-amber-400">{tWalkIn("noStaffConfigured")}</p>;
  }

  const incentiveHint =
    kind === "membership"
      ? t("sellerIncentiveHint", { amount: formatCurrency(STAFF_MEMBERSHIP_SALE_INCENTIVE_INR) })
      : tWalkIn("packageSellerIncentive", {
          amount: formatCurrency(packageSaleIncentiveFromAmount(packageSaleAmount ?? 0)),
          percent: STAFF_PACKAGE_SALE_INCENTIVE_PERCENT,
        });

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">{t("sellerLabel")}</p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("sellerTableHint")}</p>
      </div>

      {variant === "select" ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(selectClass, "w-full min-h-11")}
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {staff.map((s) => {
            const selected = value === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(s.id)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold touch-manipulation transition",
                  selected
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-emerald-500/50"
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{incentiveHint}</p>
    </div>
  );
}
