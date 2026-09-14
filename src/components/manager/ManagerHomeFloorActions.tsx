"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard, Gift, UserPlus } from "lucide-react";
import { selectClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { todayIsoDate } from "@/lib/date-range";
import { formatMoney } from "@/lib/utils";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import {
  countTodayPromoSales,
  MANAGER_HOME_INCENTIVE_RATE_PERCENT,
  pickMembershipSpotlight,
  pickPackageSpotlight,
} from "@/lib/manager-home-sell-incentives";
import {
  DEFAULT_MANAGER_HOME_WALKIN_MOTION,
  isManagerHomeWalkInMotionId,
  MANAGER_HOME_QUICK_ACTIONS_THEME,
  MANAGER_HOME_WALKIN_MOTION_STORAGE_KEY,
  MANAGER_HOME_WALKIN_MOTIONS,
  normalizeManagerHomeWalkInMotion,
  type ManagerHomeWalkInMotionId,
} from "@/lib/manager-home-walkin-motion";
import { ManagerHomeIncentivePromoCta } from "./ManagerHomeIncentivePromoCta";
import { ManagerHomePromoCta } from "./ManagerHomePromoCta";

export function ManagerHomeFloorActions() {
  const t = useTranslations("manager.home");
  const tPkg = useTranslations("manager.packages");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId ?? "";
  const localeKit = getTenantLocaleKit(user?.tenantId);
  const today = todayIsoDate();

  const [walkInMotion, setWalkInMotion] = useState<ManagerHomeWalkInMotionId>(
    DEFAULT_MANAGER_HOME_WALKIN_MOTION
  );

  useEffect(() => {
    try {
      const v3 = localStorage.getItem(MANAGER_HOME_WALKIN_MOTION_STORAGE_KEY);
      if (v3) {
        setWalkInMotion(normalizeManagerHomeWalkInMotion(v3));
        return;
      }
      setWalkInMotion(
        normalizeManagerHomeWalkInMotion(localStorage.getItem("manager-home-walkin-motion-v2"))
      );
    } catch {
      /* private mode */
    }
  }, []);

  function onWalkInMotionChange(next: string) {
    if (!isManagerHomeWalkInMotionId(next)) return;
    setWalkInMotion(next);
    try {
      localStorage.setItem(MANAGER_HOME_WALKIN_MOTION_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const { data: membershipPlans = [] } = useQuery({
    queryKey: ["manager-home-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
    staleTime: 60_000,
  });

  const { data: packagePlans = [] } = useQuery({
    queryKey: ["manager-home-package-plans", branchId],
    queryFn: () => api.getActivePackagePlans(branchId),
    enabled: !!branchId,
    staleTime: 60_000,
  });

  const { data: todayBookingsPage } = useQuery({
    queryKey: ["manager-home-today-promo-sales", branchId, today],
    queryFn: () =>
      api.getBookings({
        branchId,
        dateFrom: today,
        dateTo: today,
        page: 0,
        size: 200,
      }),
    enabled: !!branchId,
    staleTime: 30_000,
  });

  const todayCompleted = useMemo(
    () => (todayBookingsPage?.content ?? []).filter((b) => b.status === "COMPLETED"),
    [todayBookingsPage]
  );
  const todayPromo = useMemo(() => countTodayPromoSales(todayCompleted), [todayCompleted]);

  const membershipSpotlight = useMemo(() => pickMembershipSpotlight(membershipPlans), [membershipPlans]);
  const packageSpotlight = useMemo(() => pickPackageSpotlight(packagePlans), [packagePlans]);

  const activeMotion = MANAGER_HOME_WALKIN_MOTIONS.find((x) => x.id === walkInMotion);

  const membershipIncentiveChip = membershipSpotlight?.illustrativeIncentive
    ? t("incentiveChipCredit", {
        amount: formatMoney(membershipSpotlight.illustrativeIncentive, localeKit),
      })
    : t("incentiveChipBoost");

  const membershipSpotlightLine = membershipSpotlight
    ? t("incentiveMembershipSpotlight", {
        plan: membershipSpotlight.plan.name,
        price: formatMoney(membershipSpotlight.saleAmount, localeKit),
        percent: Math.round(membershipSpotlight.plan.benefitPercent),
      })
    : t("actionSellMembershipDesc");

  const membershipNudge = membershipSpotlight
    ? todayPromo.memberships > 0
      ? t("incentiveTodayMembership", { count: todayPromo.memberships })
      : t("incentiveMembershipNudge", {
          amount: formatMoney(membershipSpotlight.saleAmount, localeKit),
          rate: MANAGER_HOME_INCENTIVE_RATE_PERCENT,
        })
    : t("incentiveFootnoteGeneric");

  const packageIncentiveChip = packageSpotlight?.illustrativeIncentive
    ? t("incentiveChipGrab", {
        amount: formatMoney(packageSpotlight.illustrativeIncentive, localeKit),
      })
    : t("incentiveChipBoost");

  const packageSpotlightLine = packageSpotlight
    ? packageSpotlight.guestSavings != null && packageSpotlight.guestSavings > 0
      ? t("incentivePackageSpotlightSave", {
          plan: packageSpotlight.plan.name,
          price: formatMoney(packageSpotlight.saleAmount, localeKit),
          save: formatMoney(packageSpotlight.guestSavings, localeKit),
        })
      : t("incentivePackageSpotlight", {
          plan: packageSpotlight.plan.name,
          price: formatMoney(packageSpotlight.saleAmount, localeKit),
        })
    : tPkg("upsellSubtitleHome");

  const packageNudge = packageSpotlight
    ? todayPromo.packages > 0
      ? t("incentiveTodayPackage", { count: todayPromo.packages })
      : t("incentivePackageNudge", {
          amount: formatMoney(packageSpotlight.saleAmount, localeKit),
          rate: MANAGER_HOME_INCENTIVE_RATE_PERCENT,
        })
    : t("incentiveFootnoteGeneric");

  return (
    <div
      className="space-y-2 min-w-0"
      data-manager-cta-theme={MANAGER_HOME_QUICK_ACTIONS_THEME}
      data-manager-walkin-motion={walkInMotion}
    >
      <details className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/30 px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold text-[var(--text-secondary)] touch-manipulation list-none [&::-webkit-details-marker]:hidden">
          {t("walkInMotionSelectorLabel")}
        </summary>
        <div className="mt-2 space-y-1.5">
          <label className="block">
            <span className="ui-field-label mb-1 block">{t("walkInMotionSelect")}</span>
            <select
              className={selectClass}
              value={walkInMotion}
              onChange={(e) => onWalkInMotionChange(e.target.value)}
              aria-label={t("walkInMotionSelect")}
            >
              {MANAGER_HOME_WALKIN_MOTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {activeMotion ? (
            <p className="text-[11px] leading-snug text-[var(--text-tertiary)]">{activeMotion.hint}</p>
          ) : null}
        </div>
      </details>

      <ManagerHomePromoCta
        slot="walkin"
        href="/manager/walk-in?new=1"
        testId="manager-primary-walk-in-cta"
        title={t("newWalkIn")}
        subtitle={t("primaryWalkInSubtitle")}
        icon={UserPlus}
      />

      <section aria-labelledby="manager-quick-actions" className="min-w-0 space-y-2">
        <div>
          <h2 id="manager-quick-actions" className="section-label">
            {t("quickActions")}
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-tertiary)]">{t("quickActionsIncentiveHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <ManagerHomeIncentivePromoCta
            slot="membership"
            href="/manager/memberships?sell=1"
            title={t("actionSellMembership")}
            incentiveChip={membershipIncentiveChip}
            spotlight={membershipSpotlightLine}
            nudge={membershipNudge}
            icon={CreditCard}
          />
          <ManagerHomeIncentivePromoCta
            slot="package"
            href="/manager/packages"
            testId="manager-package-upsell-cta"
            title={tPkg("upsellTitle")}
            incentiveChip={packageIncentiveChip}
            spotlight={packageSpotlightLine}
            nudge={packageNudge}
            icon={Gift}
          />
        </div>
      </section>
    </div>
  );
}
