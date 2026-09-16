"use client";

import Link from "next/link";
import { Crown, Gift, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManagerHomePromoSlot } from "./ManagerHomePromoCta";
import {
  ManagerHomePromoActionPill,
  ManagerHomePromoFeatureTags,
} from "./ManagerHomePromoCompactParts";

export type ManagerHomeIncentivePromoProps = {
  href: string;
  title: string;
  icon: LucideIcon;
  slot: Exclude<ManagerHomePromoSlot, "walkin">;
  testId?: string;
  className?: string;
  subtitle: string;
  featureTags: readonly string[];
  actionKicker: string;
  actionPillLabel: string;
  /** @deprecated Legacy props — ignored in compact layout */
  incentiveChip?: string;
  incentiveActionLead?: string;
  incentiveActionAmount?: string;
  spotlight?: string;
  footnote?: string;
  nudge?: string;
  momentumPercent?: number;
  momentumLabel?: string;
  motion?: "claim" | "earn";
};

export function ManagerHomeIncentivePromoCta({
  href,
  title,
  slot,
  testId,
  className,
  subtitle,
  featureTags,
  actionKicker,
  actionPillLabel,
  motion = slot === "membership" ? "claim" : "earn",
}: ManagerHomeIncentivePromoProps) {
  const DisplayIcon = slot === "membership" ? Crown : Package;
  const PillIcon = motion === "claim" ? Gift : TrendingUp;

  return (
    <Link
      href={href}
      data-testid={testId}
      data-manager-cta-slot={slot}
      data-earn-motion={motion}
      className={cn(
        "manager-home-promo-compact group touch-manipulation",
        `manager-home-promo-compact--${slot}`,
        className
      )}
    >
      <span className="manager-home-promo-compact-glow" aria-hidden />

      <span className="manager-home-promo-compact-icon" aria-hidden>
        <DisplayIcon className="h-5 w-5" strokeWidth={2} />
      </span>

      <div className="manager-home-promo-compact-body min-w-0">
        <p className="manager-home-promo-compact-title">
          <span>{title}</span>
          {slot === "package" ? (
            <TrendingUp className="manager-home-promo-compact-title-deco h-3.5 w-3.5 text-sky-700" strokeWidth={2.25} aria-hidden />
          ) : null}
        </p>
        <p className="manager-home-promo-compact-subtitle">{subtitle}</p>
        <ManagerHomePromoFeatureTags slot={slot} labels={featureTags} />
      </div>

      <div className="manager-home-promo-compact-rail">
        <p className="manager-home-promo-compact-kicker">{actionKicker}</p>
        <ManagerHomePromoActionPill slot={slot} motion={motion} icon={PillIcon} label={actionPillLabel} />
      </div>
    </Link>
  );
}
