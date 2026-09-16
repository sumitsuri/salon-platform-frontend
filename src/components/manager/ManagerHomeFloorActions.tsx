"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatMoney } from "@/lib/utils";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import {
  STAFF_MEMBERSHIP_SALE_INCENTIVE_INR,
  STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR,
} from "@/lib/manager-home-sell-incentives";
import { MANAGER_HOME_QUICK_ACTIONS_THEME } from "@/lib/manager-home-walkin-motion";
import { ManagerHomeIncentivePromoCta } from "./ManagerHomeIncentivePromoCta";
import { ManagerHomeWalkInPromoCta } from "./ManagerHomeWalkInPromoCta";

export function ManagerHomeFloorActions() {
  const t = useTranslations("manager.home");
  const tPkg = useTranslations("manager.packages");
  const user = useAuthStore((s) => s.user);
  const localeKit = getTenantLocaleKit(user?.tenantId);

  const membershipAmountMoney = formatMoney(STAFF_MEMBERSHIP_SALE_INCENTIVE_INR, localeKit);
  const membershipAmountCurrency = formatCurrency(STAFF_MEMBERSHIP_SALE_INCENTIVE_INR, localeKit);
  const packageAmountMoney = formatMoney(STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR, localeKit);
  const packageAmountCurrency = formatCurrency(STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR, localeKit);

  const membershipTags = [
    t("membershipPromoTagBenefits"),
    t("membershipPromoTagEnroll"),
    t("membershipPromoTagEarn", { amount: membershipAmountMoney }),
  ] as const;

  const packageTags = [
    t("packagePromoTagShow"),
    t("packagePromoTagClose"),
    t("packagePromoTagEarn", { amount: packageAmountMoney }),
  ] as const;

  return (
    <section
      className="min-w-0 space-y-2"
      data-manager-cta-theme={MANAGER_HOME_QUICK_ACTIONS_THEME}
      aria-labelledby="manager-earnings-actions"
    >
      <div className="manager-home-earnings-header">
        <h2 id="manager-earnings-actions" className="manager-home-earnings-title">
          {t("earningsWalkAwayTitle")} <span aria-hidden>🏃</span>
        </h2>
        <Link href="#team-performance" className="manager-home-earnings-view-all touch-manipulation">
          {t("viewPerformance")}
          <span aria-hidden>&gt;</span>
        </Link>
      </div>

      <ManagerHomeWalkInPromoCta />

      <div className="grid grid-cols-1 gap-2">
        <ManagerHomeIncentivePromoCta
          slot="membership"
          href="/manager/memberships?sell=1"
          title={t("actionSellMembership")}
          subtitle={t("membershipPromoSubtitle")}
          featureTags={membershipTags}
          actionKicker={t("membershipPromoKicker")}
          actionPillLabel={t("membershipPromoPill", { amount: membershipAmountCurrency })}
          icon={Gift}
          motion="claim"
        />
        <ManagerHomeIncentivePromoCta
          slot="package"
          href="/manager/packages"
          testId="manager-package-upsell-cta"
          title={tPkg("upsellTitle")}
          subtitle={t("packagePromoSubtitle")}
          featureTags={packageTags}
          actionKicker={t("packagePromoKicker")}
          actionPillLabel={t("packagePromoPill", { amount: packageAmountCurrency })}
          icon={Gift}
          motion="earn"
        />
      </div>
    </section>
  );
}
