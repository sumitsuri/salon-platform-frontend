"use client";

import Link from "next/link";
import { UserPlus, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

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
  ] as const;

  return (
    <Link
      href={href}
      data-testid={testId}
      data-manager-cta-slot="walkin"
      className="manager-home-walkin-promo group touch-manipulation"
    >
      <span className="manager-home-walkin-promo-glow" aria-hidden />

      <span className="manager-home-walkin-promo-icon-wrap" aria-hidden>
        <UserPlus className="h-6 w-6" strokeWidth={2.1} />
      </span>

      <div className="manager-home-walkin-promo-copy min-w-0">
        <p className="manager-home-walkin-promo-title">{t("newWalkIn")}</p>
        <p className="manager-home-walkin-promo-subtitle">{t("walkInPromoSubtitle")}</p>
      </div>

      <p className="manager-home-walkin-promo-kicker" aria-hidden>
        {t("walkInPromoKicker")}
      </p>

      <div className="manager-home-walkin-promo-tags">
        {tags.map((label, index) => (
          <span key={label} className="manager-home-walkin-promo-tags-group">
            {index > 0 ? <span className="manager-home-walkin-promo-tag-dot" aria-hidden /> : null}
            <span className="manager-home-walkin-promo-tag">{label}</span>
          </span>
        ))}
      </div>

      <span className="manager-home-walkin-promo-quick-bill">
        <Zap className="manager-home-walkin-promo-quick-bill-icon h-4 w-4 shrink-0" aria-hidden />
        <span className="manager-home-walkin-promo-quick-bill-label">{t("walkInPromoQuickBill")}</span>
        <span className="manager-home-walkin-promo-quick-bill-chevrons" aria-hidden>
          &gt;&gt;
        </span>
      </span>
    </Link>
  );
}
