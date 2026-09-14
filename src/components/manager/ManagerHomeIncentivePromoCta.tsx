"use client";

import Link from "next/link";
import { ChevronRight, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManagerHomePromoSlot } from "./ManagerHomePromoCta";

export type ManagerHomeIncentivePromoProps = {
  href: string;
  title: string;
  icon: LucideIcon;
  slot: Exclude<ManagerHomePromoSlot, "walkin">;
  testId?: string;
  className?: string;
  /** Primary motivator — e.g. “Up to ₹150 incentive credit” */
  incentiveChip: string;
  /** Plan spotlight — price + guest value */
  spotlight: string;
  /** Secondary nudge — target, streak, footnote */
  nudge?: string;
  /** Optional progress 0–100 for “push toward target” micro-bar */
  momentumPercent?: number;
  momentumLabel?: string;
};

export function ManagerHomeIncentivePromoCta({
  href,
  title,
  icon: Icon,
  slot,
  testId,
  className,
  incentiveChip,
  spotlight,
  nudge,
  momentumPercent,
  momentumLabel,
}: ManagerHomeIncentivePromoProps) {
  const showMomentum =
    momentumPercent != null && Number.isFinite(momentumPercent) && momentumLabel && momentumPercent > 0;

  return (
    <Link
      href={href}
      data-testid={testId}
      data-manager-cta-slot={slot}
      className={cn(
        "manager-home-incentive-cta group touch-manipulation",
        `manager-home-incentive-cta--${slot}`,
        className
      )}
    >
      <span className="manager-home-incentive-cta-accent" aria-hidden />

      <span className="manager-home-incentive-cta-icon-wrap" aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </span>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-start gap-2 min-w-0">
          <p className="manager-home-incentive-cta-title min-w-0 flex-1 truncate">{title}</p>
          <span className="manager-home-incentive-cta-chip shrink-0">
            <Sparkles className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="max-w-[9.5rem] truncate sm:max-w-[11rem]">{incentiveChip}</span>
          </span>
        </div>
        <p className="manager-home-incentive-cta-spotlight">{spotlight}</p>
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

      <ChevronRight className="manager-home-incentive-cta-chevron h-5 w-5 shrink-0" aria-hidden />
    </Link>
  );
}
