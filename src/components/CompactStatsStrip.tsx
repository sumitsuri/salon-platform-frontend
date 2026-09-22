"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompactStatAccent = "violet" | "sky" | "emerald" | "amber" | "rose";

export type CompactStatItem = {
  id: string;
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: CompactStatAccent;
  href?: string;
  onClick?: () => void;
  testId?: string;
  pulse?: boolean;
  featured?: boolean;
};

export function CompactStatsStrip({
  items,
  className,
  testId = "compact-stats-strip",
  loading,
  dense3,
}: {
  items: CompactStatItem[];
  className?: string;
  testId?: string;
  loading?: boolean;
  /** Fixed 3-per-row layout with tighter padding — for screens where vertical space is tight. */
  dense3?: boolean;
}) {
  const gridCountClass = dense3
    ? "compact-stats-grid--dense-3"
    : items.length === 3
      ? "compact-stats-grid--count-3"
      : items.length === 2
        ? "compact-stats-grid--count-2"
        : undefined;
  // Dense-3 rows are computed here (not via nth-child CSS) so the bottom border on the
  // true last row is correct for any item count, including a partially-filled final row.
  const lastRowStart = dense3 ? items.length - (items.length % 3 || 3) : -1;

  if (loading) {
    const skeletonCount = dense3 ? 6 : items.length === 3 ? 3 : 4;
    return (
      <div className={cn("compact-stats-strip", className)} data-testid={testId}>
        <div className={cn("compact-stats-grid", gridCountClass)}>
          {Array.from({ length: skeletonCount })
            .slice(0, skeletonCount)
            .map((_, index) => (
            <div
              key={index}
              className="compact-stat-cell compact-stat-cell--skeleton animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("compact-stats-strip", className)} data-testid={testId}>
      <div className={cn("compact-stats-grid", gridCountClass)}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const accent = item.accent ?? "violet";
          const cellClass = cn(
            "compact-stat-cell touch-manipulation text-left",
            `compact-stat-cell--${accent}`,
            item.featured && "compact-stat-cell--featured",
            item.pulse && "compact-stat-cell--pulse",
            (item.href || item.onClick) && "compact-stat-cell--interactive",
            dense3 && index >= lastRowStart && "compact-stat-cell--no-bottom-border"
          );
          const content = (
            <>
              {Icon ? (
                <span className={cn("compact-stat-icon", `compact-stat-icon--${accent}`)} aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <span className="compact-stat-value tabular-nums">{item.value}</span>
              <span className="compact-stat-label">{item.label}</span>
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                data-testid={item.testId}
                className={cellClass}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {content}
              </Link>
            );
          }

          if (item.onClick) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                data-testid={item.testId}
                className={cellClass}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={item.id}
              data-testid={item.testId}
              className={cellClass}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
