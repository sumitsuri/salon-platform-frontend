"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  exact?: boolean;
  fab?: boolean;
};

interface MobileBottomNavProps {
  items: MobileNavItem[];
  isActive: (href: string, exact?: boolean) => boolean;
  fabColor?: string;
}

export function MobileBottomNav({ items, isActive, fabColor }: MobileBottomNavProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--nav-bg)] border-t border-[var(--border)] shadow-[0_-4px_24px_var(--shadow-color)]"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0px, env(safe-area-inset-right, 0px))",
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-end w-full max-w-[100vw] overflow-hidden px-0.5 pt-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          const isFab = item.fab === true;
          const displayLabel = item.shortLabel ?? item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex flex-1 basis-0 min-w-0 flex-col items-center justify-end gap-0.5 py-1.5 rounded-lg transition touch-manipulation",
                active && !isFab && "text-[var(--brand-text)]",
                !active && !isFab && "text-[var(--text-tertiary)]",
                isFab && "relative -mt-2 sm:-mt-3 mx-0 sm:mx-0.5 text-white rounded-2xl shadow-lg py-2 px-0.5 sm:px-1"
              )}
              style={
                isFab && fabColor
                  ? { backgroundColor: fabColor, boxShadow: `0 6px 20px ${fabColor}40` }
                  : undefined
              }
            >
              <Icon className={cn("shrink-0", isFab ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-5 sm:h-5")} />
              <span
                className={cn(
                  "w-full max-w-[4rem] text-center font-semibold leading-tight truncate px-0.5",
                  isFab ? "text-[9px] sm:text-[10px]" : "text-[9px] sm:text-[10px]",
                  "max-[340px]:hidden min-[340px]:block"
                )}
              >
                {displayLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Bottom padding for main content when mobile nav is visible */
export const MOBILE_NAV_MAIN_PADDING = "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6";
export const MOBILE_NAV_MAIN_PADDING_FAB = "pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6";
