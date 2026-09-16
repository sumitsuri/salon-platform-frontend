"use client";

import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  Crown,
  Gift,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManagerHomePromoSlot } from "./ManagerHomePromoCta";

export type ManagerHomeIncentivePromoProps = {
  href: string;
  title: string;
  icon: LucideIcon;
  slot: Exclude<ManagerHomePromoSlot, "walkin">;
  testId?: string;
  className?: string;
  /** @deprecated Use incentiveActionLead + incentiveActionAmount */
  incentiveChip?: string;
  incentiveActionLead?: string;
  incentiveActionAmount?: string;
  spotlight: string;
  footnote?: string;
  nudge?: string;
  momentumPercent?: number;
  momentumLabel?: string;
  motion?: "claim" | "earn";
};

function StaticRewardPill({
  lead,
  amount,
  motion,
}: {
  lead: string;
  amount: string;
  motion: "claim" | "earn";
}) {
  const RewardIcon = motion === "claim" ? Gift : Zap;
  return (
    <div
      className={cn(
        "manager-home-reward-pill",
        motion === "claim" && "manager-home-reward-pill--claim",
        motion === "earn" && "manager-home-reward-pill--earn"
      )}
    >
      {motion === "claim" ? (
        <span className="manager-home-reward-pill-icon-box manager-home-reward-pill-icon-box--claim" aria-hidden>
          <RewardIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
        </span>
      ) : (
        <span className="manager-home-reward-pill-icon-circle manager-home-reward-pill-icon-circle--earn" aria-hidden>
          <RewardIcon className="h-3.5 w-3.5 text-sky-950" strokeWidth={2.5} />
        </span>
      )}
      <span className="manager-home-reward-pill-copy">
        <span className="manager-home-reward-pill-lead">{lead}</span>
        <span className="manager-home-reward-pill-amount">{amount}</span>
      </span>
      <span className="manager-home-reward-pill-chevrons" aria-hidden>
        &gt;&gt;
      </span>
    </div>
  );
}

export function ManagerHomeIncentivePromoCta({
  href,
  title,
  icon: Icon,
  slot,
  testId,
  className,
  incentiveChip,
  incentiveActionLead,
  incentiveActionAmount,
  spotlight,
  footnote,
  nudge,
  momentumPercent,
  momentumLabel,
  motion,
}: ManagerHomeIncentivePromoProps) {
  const showMomentum =
    momentumPercent != null && Number.isFinite(momentumPercent) && momentumLabel && momentumPercent > 0;
  const animated = motion === "claim" || motion === "earn";
  const DisplayIcon = slot === "membership" && animated ? CreditCard : Icon;
  const showSplitPill =
    animated && motion && incentiveActionLead != null && incentiveActionAmount != null;

  const card = (
    <Link
      href={href}
      data-testid={testId}
      data-manager-cta-slot={slot}
      data-earn-motion={motion}
      className={cn(
        "manager-home-incentive-cta group touch-manipulation",
        `manager-home-incentive-cta--${slot}`,
        animated && "manager-home-incentive-cta--animated-card manager-home-incentive-cta--boost",
        className
      )}
    >
      {animated ? (
        <>
          <span className="manager-home-incentive-cta-glass-shine" aria-hidden />
          <span className="manager-home-incentive-cta-glow-border" aria-hidden />
          <span className="manager-home-incentive-cta-sparkle manager-home-incentive-cta-sparkle--tl" aria-hidden />
          <span className="manager-home-incentive-cta-sparkle manager-home-incentive-cta-sparkle--tr" aria-hidden />
          <span className="manager-home-incentive-cta-sparkle manager-home-incentive-cta-sparkle--bl" aria-hidden />
          <span className="manager-home-incentive-cta-sparkle manager-home-incentive-cta-sparkle--br" aria-hidden />
        </>
      ) : null}

      {slot === "membership" && animated ? (
        <>
          <span className="manager-home-incentive-cta-crown-badge" aria-hidden>
            <Crown className="h-3.5 w-3.5 text-amber-950" strokeWidth={2.25} />
          </span>
          <BarChart3 className="manager-home-incentive-cta-deco manager-home-incentive-cta-deco--chart" aria-hidden />
        </>
      ) : null}
      {slot === "package" && animated ? (
        <>
          <TrendingUp className="manager-home-incentive-cta-deco manager-home-incentive-cta-deco--package-arrow" aria-hidden />
          <Sparkles className="manager-home-incentive-cta-deco manager-home-incentive-cta-deco--package-sparkle" aria-hidden />
        </>
      ) : null}

      <span className="manager-home-incentive-cta-icon-wrap" aria-hidden>
        <DisplayIcon className="h-6 w-6" strokeWidth={2} />
      </span>

      <div className="manager-home-incentive-cta-body min-w-0 flex-1 text-left">
        <p className="manager-home-incentive-cta-title">{title}</p>
        <p className="manager-home-incentive-cta-spotlight">{spotlight}</p>
        {footnote ? <p className="manager-home-incentive-cta-footnote">{footnote}</p> : null}
        {nudge ? <p className="manager-home-incentive-cta-nudge">{nudge}</p> : null}
        {showMomentum ? (
          <div className="manager-home-incentive-cta-momentum" aria-hidden>
            <div className="manager-home-incentive-cta-momentum-track">
              <div
                className="manager-home-incentive-cta-momentum-fill"
                style={{ width: `${Math.min(100, Math.max(4, momentumPercent))}%` }}
              />
            </div>
            <span className="manager-home-incentive-cta-momentum-label">{momentumLabel}</span>
          </div>
        ) : null}
      </div>

      {showSplitPill ? (
        <div className="manager-home-reward-pill-anchor">
          <StaticRewardPill
            lead={incentiveActionLead}
            amount={incentiveActionAmount}
            motion={motion}
          />
        </div>
      ) : incentiveChip ? (
        <span className="manager-home-incentive-cta-chip manager-home-incentive-cta-chip--static">{incentiveChip}</span>
      ) : null}
    </Link>
  );

  if (!animated) return card;

  return (
    <div className="manager-home-earn-now-card-shell">
      <span className="manager-home-incentive-cta-pulse-arc manager-home-incentive-cta-pulse-arc--left" aria-hidden />
      <span className="manager-home-incentive-cta-pulse-arc manager-home-incentive-cta-pulse-arc--right" aria-hidden />
      {card}
    </div>
  );
}
