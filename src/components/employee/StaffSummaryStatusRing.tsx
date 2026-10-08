"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { TargetTrafficBand } from "@/components/manager/ManagerHomeTargetChip";

type Props = {
  band: TargetTrafficBand | "neutral";
  ringPct: number;
  icon: ComponentType<{ className?: string }>;
  className?: string;
};

/** Minimal progress ring — neutral track, small accent arc by MTD state (no card tint). */
export function StaffSummaryStatusRing({ band, ringPct, icon: Icon, className }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(ringPct)));
  const bandClass = band === "neutral" ? "staff-summary-ring-wrap--neutral" : `staff-summary-ring-wrap--${band}`;
  // Tiny arc at 0% so status color reads without flooding the icon area
  const arcPct = band !== "neutral" && pct === 0 ? 6 : pct;

  return (
    <div className={cn("staff-summary-ring-wrap shrink-0", bandClass, className)} aria-hidden>
      <div className="staff-summary-ring" style={{ ["--ring-pct" as string]: arcPct }}>
        <div className="staff-summary-ring-inner">
          <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
      </div>
    </div>
  );
}
