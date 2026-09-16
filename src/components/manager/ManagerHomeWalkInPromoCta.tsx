"use client";

import Link from "next/link";
import { UserPlus, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { ManagerHomePromoFeatureTags } from "./ManagerHomePromoCompactParts";

type Props = {
  href?: string;
  testId?: string;
};

export function ManagerHomeWalkInPromoCta({
  href = "/manager/walk-in?new=1",
  testId = "manager-primary-walk-in-cta",
}: Props) {
  const t = useTranslations("manager.home");

  const tags = [
    t("walkInPromoTagCheckout"),
    t("walkInPromoTagServices"),
    t("walkInPromoTagBill"),
  ];

  return (
    <Link
      href={href}
      data-testid={testId}
      data-manager-cta-slot="walkin"
      className="manager-home-promo-compact manager-home-promo-compact--walkin group touch-manipulation"
    >
      <span className="manager-home-promo-compact-glow" aria-hidden />

      <span className="manager-home-promo-compact-icon" aria-hidden>
        <UserPlus className="h-5 w-5" strokeWidth={2.1} />
      </span>

      <div className="manager-home-promo-compact-body min-w-0">
        <p className="manager-home-promo-compact-title">{t("newWalkIn")}</p>
        <p className="manager-home-promo-compact-subtitle">{t("walkInPromoSubtitle")}</p>
        <ManagerHomePromoFeatureTags slot="walkin" labels={tags} />
      </div>

      <div className="manager-home-promo-compact-rail">
        <p className="manager-home-promo-compact-kicker">{t("walkInPromoKicker")}</p>
        <span className="manager-home-promo-compact-pill manager-home-promo-compact-pill--walkin">
          <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="manager-home-promo-compact-pill-label">{t("walkInPromoQuickBill")}</span>
          <span className="manager-home-promo-compact-pill-chevrons" aria-hidden>
            &gt;&gt;
          </span>
        </span>
      </div>
    </Link>
  );
}
