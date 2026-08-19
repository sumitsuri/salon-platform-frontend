"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type WalkInCatalogTrailSegment = {
  id: string;
  label: string;
  active?: boolean;
  onSelect?: () => void;
};

interface WalkInCatalogTrailProps {
  segments: WalkInCatalogTrailSegment[];
  className?: string;
}

export function WalkInCatalogTrail({ segments, className }: WalkInCatalogTrailProps) {
  const t = useTranslations("manager.walkIn");

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label={t("catalogTrailLabel")}
      className={cn("flex min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain touch-scroll-x", className)}
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const isInteractive = Boolean(segment.onSelect) && !segment.active;

        return (
          <span key={segment.id} className="inline-flex min-w-0 shrink-0 items-center gap-0.5">
            {index > 0 ? (
              <ChevronRight className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            ) : null}
            {isInteractive ? (
              <button
                type="button"
                onClick={segment.onSelect}
                className="truncate rounded px-0.5 text-[11px] font-semibold text-[var(--brand-text)] hover:underline touch-manipulation max-w-[8rem] sm:max-w-[10rem]"
              >
                {segment.label}
              </button>
            ) : (
              <span
                className={cn(
                  "truncate text-[11px] font-semibold max-w-[8rem] sm:max-w-[12rem]",
                  segment.active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                )}
                aria-current={segment.active ? "location" : undefined}
              >
                {segment.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
