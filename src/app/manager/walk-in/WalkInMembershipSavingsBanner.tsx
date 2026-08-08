"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BadgePercent } from "lucide-react";
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
