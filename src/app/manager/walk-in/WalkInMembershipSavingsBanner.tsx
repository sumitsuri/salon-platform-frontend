"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BadgePercent, ChevronDown } from "lucide-react";
import { api, BranchServiceItem } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { type TenantLocaleKit } from "@/lib/tenant-locale";
import { Callout } from "@/components/ui";
import { WalkInCartItem } from "./walk-in-types";
import { estimateBestMembershipSavings, maxMembershipBenefitPercent } from "./membership-savings";

export function WalkInMembershipSavingsBanner({
  customerName,
  cart,
  servicesById,
  localeKit,
  compact = false,
}: {
  customerName: string;
  cart: WalkInCartItem[];
  servicesById: Map<string, BranchServiceItem>;
  localeKit: TenantLocaleKit;
  compact?: boolean;
}) {
  const t = useTranslations("manager.walkIn");
  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const estimate = useMemo(
    () => estimateBestMembershipSavings(cart, servicesById, plans),
    [cart, servicesById, plans],
  );

  if (plans.length === 0 || !estimate) return null;

  const name = customerName.trim() || t("guestCustomer");
  const maxPercent = maxMembershipBenefitPercent(plans);
  const hasCartSavings = cart.length > 0 && estimate.amount > 0;

  if (compact) {
    const summary = hasCartSavings
      ? t("membershipMissChipAmount", {
          amount: formatMoney(estimate.amount, localeKit),
          percent: estimate.benefitPercent,
        })
      : t("membershipMissChipEmpty", { percent: maxPercent });

    return (
      <details className="group rounded-lg border border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs font-semibold text-amber-900 touch-manipulation dark:text-amber-200">
          <BadgePercent className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-amber-200/60 px-2.5 py-2 text-xs text-[var(--text-secondary)] dark:border-amber-900/40">
          {hasCartSavings ? (
            <p>
              {t("membershipMissAmount", {
                name,
                amount: formatMoney(estimate.amount, localeKit),
                percent: estimate.benefitPercent,
                plan: estimate.planName,
              })}
            </p>
          ) : (
            <p>{t("membershipMissEmptyCart", { name, percent: maxPercent })}</p>
          )}
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{t("membershipMissHint")}</p>
        </div>
      </details>
    );
  }

  return (
    <Callout
      variant="insight"
      icon={<BadgePercent className="w-5 h-5 text-amber-700 dark:text-amber-400" aria-hidden />}
      title={t("membershipMissTitle", { name })}
    >
      {hasCartSavings ? (
        <p>
          {t("membershipMissAmount", {
            name,
            amount: formatMoney(estimate.amount, localeKit),
            percent: estimate.benefitPercent,
            plan: estimate.planName,
          })}
        </p>
      ) : (
        <p>{t("membershipMissEmptyCart", { name, percent: maxPercent })}</p>
      )}
      <p className="text-xs text-[var(--text-tertiary)]">{t("membershipMissHint")}</p>
    </Callout>
  );
}
