"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalkInCtaPerimeter } from "./WalkInCtaPerimeter";

export type ManagerHomePromoSlot = "walkin" | "membership" | "package";

type Props = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  slot: ManagerHomePromoSlot;
  testId?: string;
  className?: string;
};

/** Animated manager-home action row — themed via parent `data-manager-cta-theme`. */
export function ManagerHomePromoCta({ href, title, subtitle, icon: Icon, slot, testId, className }: Props) {
  return (
    <Link
      href={href}
      data-testid={testId}
      data-manager-cta-slot={slot}
      className={cn(
        "manager-walk-in-cta manager-home-cta group touch-manipulation",
        `manager-home-cta--${slot}`,
        className
      )}
    >
      {slot === "walkin" ? (
        <>
          <span className="manager-walk-in-cta-ambient" aria-hidden />
          <span className="manager-walk-in-cta-edge" aria-hidden />
          <span className="manager-walk-in-cta-bill-accent" aria-hidden />
          <span className="manager-walk-in-cta-bill-bar" aria-hidden />
          <span className="manager-walk-in-cta-live-dot" aria-hidden />
          <WalkInCtaPerimeter />
        </>
      ) : null}
      <span className="manager-walk-in-cta-shimmer" aria-hidden />
      <span className="manager-walk-in-cta-glow" aria-hidden />

      <span className="manager-walk-in-cta-icon-wrap" aria-hidden>
        <span className="manager-walk-in-cta-icon-ring" />
        <span className="manager-walk-in-cta-icon">
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </span>
      </span>

      <div className="min-w-0 flex-1 text-left">
        <p className="manager-walk-in-cta-title">{title}</p>
        <p className="manager-walk-in-cta-subtitle">{subtitle}</p>
      </div>

      <ChevronRight className="manager-walk-in-cta-chevron h-6 w-6 shrink-0" aria-hidden />
    </Link>
  );
}
