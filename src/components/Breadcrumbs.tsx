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
  testId = "breadcrumbs",
}: {
  items: BreadcrumbItem[];
  className?: string;
  compact?: boolean;
  testId?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" data-testid={testId} className={cn("flex items-center min-w-0", className)}>
      <ol className="flex items-center gap-1 min-w-0 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const content = (
            <span
              className={cn(
                "truncate block max-w-[8rem] sm:max-w-[12rem] md:max-w-none",
                isLast
                  ? "font-semibold text-[var(--text-primary)]"
                  : "font-medium text-[var(--brand-text)] hover:opacity-80"
              )}
            >
              {item.label}
            </span>
          );

          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />}
              {isLast || (!item.href && !item.onClick) ? (
                <span className="min-w-0" aria-current={isLast ? "page" : undefined}>
                  {content}
                </span>
              ) : item.href ? (
                <Link href={item.href} className="min-w-0 touch-manipulation">
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={item.onClick} className="min-w-0 text-left touch-manipulation">
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
