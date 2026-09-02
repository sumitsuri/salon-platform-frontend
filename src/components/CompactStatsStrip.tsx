"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompactStatAccent = "violet" | "sky" | "emerald" | "amber";

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
}: {
  items: CompactStatItem[];
  className?: string;
  testId?: string;
  loading?: boolean;
}) {
  const gridCountClass =
    items.length === 3
      ? "compact-stats-grid--count-3"
      : items.length === 2
        ? "compact-stats-grid--count-2"
        : undefined;

  if (loading) {
    return (
      <div className={cn("compact-stats-strip", className)} data-testid={testId}>
        <div className={cn("compact-stats-grid", gridCountClass)}>
          {Array.from({ length: items.length === 3 ? 3 : Math.max(items.length, 4) })
            .slice(0, items.length === 3 ? 3 : 4)
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
            (item.href || item.onClick) && "compact-stat-cell--interactive"
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
