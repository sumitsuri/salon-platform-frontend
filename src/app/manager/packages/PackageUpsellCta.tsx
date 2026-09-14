"use client";

import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  title: string;
  subtitle: string;
  className?: string;
};

/** Animated upsell strip — same motion and surface as manager “new walk-in” CTA. */
export function PackageUpsellCta({ href, title, subtitle, className }: Props) {
  return (
    <Link
      href={href}
      data-testid="manager-package-upsell-cta"
      className={cn("manager-walk-in-cta group touch-manipulation", className)}
    >
      <span className="manager-walk-in-cta-shimmer" aria-hidden />
      <span className="manager-walk-in-cta-glow" aria-hidden />

      <span className="manager-walk-in-cta-icon-wrap" aria-hidden>
        <span className="manager-walk-in-cta-icon-ring" />
        <span className="manager-walk-in-cta-icon">
          <Gift className="h-6 w-6" strokeWidth={2.25} />
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
