"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { selectClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { todayIsoDate } from "@/lib/date-range";
import { formatCurrency, formatMoney } from "@/lib/utils";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import {
  countTodayPromoSales,
  pickPackageSpotlight,
  STAFF_MEMBERSHIP_SALE_INCENTIVE_INR,
  STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR,
  STAFF_PACKAGE_SALE_INCENTIVE_PERCENT,
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
import { ManagerHomeWalkInPromoCta } from "./ManagerHomeWalkInPromoCta";

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

  const packageSpotlight = useMemo(() => pickPackageSpotlight(packagePlans), [packagePlans]);

  const activeMotion = MANAGER_HOME_WALKIN_MOTIONS.find((x) => x.id === walkInMotion);

  const membershipActionLead = t("incentiveChipClaimYourLead");
  const membershipActionAmount = formatCurrency(STAFF_MEMBERSHIP_SALE_INCENTIVE_INR, localeKit);

  const membershipSpotlightLine = t("incentiveMembershipStaffDesc");

  const membershipFootnote = t("incentiveMembershipNudge", {
    amount: formatMoney(STAFF_MEMBERSHIP_SALE_INCENTIVE_INR, localeKit),
  });

  const membershipNudge =
    todayPromo.memberships > 0
      ? t("incentiveTodayMembership", { count: todayPromo.memberships })
      : undefined;

  const packageActionLead = t("incentiveChipEarnUptoLead");
  const packageActionAmount = formatCurrency(STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR, localeKit);

  const packageSpotlightLine = t("incentivePackageStaffDesc", {
    percent: STAFF_PACKAGE_SALE_INCENTIVE_PERCENT,
    max: formatMoney(STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR, localeKit),
  });

  const packageNudge = packageSpotlight
    ? todayPromo.packages > 0
      ? t("incentiveTodayPackage", { count: todayPromo.packages })
      : undefined
    : undefined;

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

      <ManagerHomeWalkInPromoCta />

      <section aria-labelledby="manager-earn-now" className="min-w-0 space-y-2.5 manager-home-earn-now-section">
        <div className="manager-home-earn-now-header">
          <h2 id="manager-earn-now" className="manager-home-earn-now-title">
            {t("earnNow")}
          </h2>
          <p className="manager-home-earn-now-tagline">
            <span className="manager-home-earn-now-tagline-text">{t("earnNowTagline")}</span>
            <svg className="manager-home-earn-now-tagline-arrow" viewBox="0 0 56 28" fill="none" aria-hidden>
              <path
                d="M2 20 C 12 8, 26 6, 52 12"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                d="M46 8 L54 12 L48 20"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 manager-home-earn-now-pulse">
          <ManagerHomeIncentivePromoCta
            slot="membership"
            href="/manager/memberships?sell=1"
            title={t("actionSellMembership")}
            incentiveActionLead={membershipActionLead}
            incentiveActionAmount={membershipActionAmount}
            spotlight={membershipSpotlightLine}
            footnote={membershipFootnote}
            nudge={membershipNudge}
            icon={Gift}
            motion="claim"
          />
          <ManagerHomeIncentivePromoCta
            slot="package"
            href="/manager/packages"
            testId="manager-package-upsell-cta"
            title={tPkg("upsellTitle")}
            incentiveActionLead={packageActionLead}
            incentiveActionAmount={packageActionAmount}
            spotlight={packageSpotlightLine}
            nudge={packageNudge}
            icon={Gift}
            motion="earn"
          />
        </div>
      </section>
    </div>
  );
}
