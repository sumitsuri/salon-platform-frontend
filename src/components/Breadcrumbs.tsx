"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function Breadcrumbs({
  items,
  className,
  compact = false,
  variant = "default",
  testId = "breadcrumbs",
}: {
  items: BreadcrumbItem[];
  className?: string;
  compact?: boolean;
  /** trail = ancestor links only (paired with a separate page title) */
  variant?: "default" | "trail";
  testId?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" data-testid={testId} className={cn("flex items-center min-w-0", className)}>
      <ol
        className={cn(
          "flex items-center gap-1 min-w-0",
          variant === "trail" ? "text-xs text-[var(--text-tertiary)]" : "text-sm"
        )}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isCurrent = variant === "default" && isLast;
          const content = (
            <span
              className={cn(
                "truncate block max-w-[8rem] sm:max-w-[12rem] md:max-w-none",
                isCurrent
                  ? "font-semibold text-[var(--text-primary)]"
                  : variant === "trail"
                    ? "font-medium text-[var(--brand-text)] hover:text-[var(--brand-dark)]"
                    : "font-medium text-[var(--brand-text)] hover:opacity-80"
              )}
            >
              {item.label}
            </span>
          );

          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />}
              {isCurrent || (!item.href && !item.onClick) ? (
                <span className="min-w-0" aria-current={isCurrent ? "page" : undefined}>
                  {content}
                </span>
              ) : item.onClick ? (
                <button type="button" onClick={item.onClick} className="min-w-0 text-left touch-manipulation">
                  {content}
                </button>
              ) : item.href ? (
                <Link href={item.href} className="min-w-0 touch-manipulation">
                  {content}
                </Link>
              ) : (
                <span className="min-w-0">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
