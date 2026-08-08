"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BadgePercent } from "lucide-react";
import { api, BranchServiceItem } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { type TenantLocaleKit } from "@/lib/tenant-locale";
import { WalkInCartItem } from "./walk-in-types";
import { estimateBestMembershipSavings, maxMembershipBenefitPercent } from "./membership-savings";

export function WalkInMembershipSavingsBanner({
  customerName,
  cart,
  servicesById,
  localeKit,
}: {
  customerName: string;
  cart: WalkInCartItem[];
  servicesById: Map<string, BranchServiceItem>;
  localeKit: TenantLocaleKit;
}) {
  const t = useTranslations("manager.walkIn");
  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const estimate = useMemo(
    () => estimateBestMembershipSavings(cart, servicesById, plans),
    [cart, servicesById, plans]
  );

  if (plans.length === 0 || !estimate) return null;

  const name = customerName.trim() || t("guestCustomer");
  const maxPercent = maxMembershipBenefitPercent(plans);
  const hasCartSavings = cart.length > 0 && estimate.amount > 0;

  return (
    <div className="rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/25 px-3.5 py-3 text-amber-950 dark:text-amber-100">
      <div className="flex gap-2.5">
        <BadgePercent className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-sm leading-snug">{t("membershipMissTitle", { name })}</p>
          {hasCartSavings ? (
            <p className="text-sm leading-snug text-amber-900/90 dark:text-amber-50/90">
              {t("membershipMissAmount", {
                name,
                amount: formatMoney(estimate.amount, localeKit),
                percent: estimate.benefitPercent,
                plan: estimate.planName,
              })}
            </p>
          ) : (
            <p className="text-sm leading-snug text-amber-900/90 dark:text-amber-50/90">
              {t("membershipMissEmptyCart", { name, percent: maxPercent })}
            </p>
          )}
          <p className="text-xs text-amber-800/75 dark:text-amber-200/70">{t("membershipMissHint")}</p>
        </div>
      </div>
    </div>
  );
}
