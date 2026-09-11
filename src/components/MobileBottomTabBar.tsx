"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileBottomTabItem, isNavActive, normalizeNavPath } from "@/components/app-nav";

type Props = {
  tabs: MobileBottomTabItem[];
  brandColor?: string;
  moreLabel: string;
  moreActive?: boolean;
  onMoreClick: () => void;
  hidden?: boolean;
};

function tabActive(pathname: string, tab: MobileBottomTabItem): boolean {
  const path = normalizeNavPath(pathname);
  if (tab.activePrefixes?.some((prefix) => path.startsWith(normalizeNavPath(prefix)))) {
    return true;
  }
  if (tab.exact) {
    return path === normalizeNavPath(tab.href);
  }
  return isNavActive(pathname, tab.href, tab.exact);
}

function renderTab(tab: MobileBottomTabItem, pathname: string) {
  const Icon = tab.icon;
  const active = tabActive(pathname, tab);
  return (
    <Link
      key={tab.id}
      href={tab.href}
      prefetch={false}
      data-testid={`mobile-tab-${tab.id}`}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-xl mx-0.5 touch-manipulation transition-colors min-h-[3rem]",
        active
          ? "text-[var(--brand-text)] bg-[var(--brand-light)]/50"
          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active && "text-[var(--brand)]")} aria-hidden />
      <span className="text-[10px] font-bold leading-none tracking-tight">{tab.label}</span>
    </Link>
  );
}

function renderPrimary(tab: MobileBottomTabItem, brandColor: string) {
  return (
    <Link
      key={tab.id}
      href={tab.href}
      prefetch={false}
      data-testid={`mobile-tab-${tab.id}`}
      aria-label={tab.label}
      className="flex flex-col items-center justify-center touch-manipulation -mt-3"
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform active:scale-[0.96]"
        style={{
          backgroundColor: brandColor,
          boxShadow: `0 8px 24px color-mix(in srgb, ${brandColor} 45%, transparent)`,
        }}
      >
        <tab.icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="mt-1 text-[10px] font-bold text-[var(--brand-text)] leading-none">{tab.label}</span>
    </Link>
  );
}

export function MobileBottomTabBar({
  tabs,
  brandColor = "var(--brand)",
  moreLabel,
  moreActive,
  onMoreClick,
  hidden,
}: Props) {
  const pathname = usePathname();

  if (hidden) return null;

  const hideBar = tabs.some((tab) =>
    tab.hideBarOnPrefixes?.some((prefix) => normalizeNavPath(pathname).startsWith(normalizeNavPath(prefix))),
  );
  if (hideBar) return null;

  const regularTabs = tabs.filter((t) => !t.primary);
  const primaryTab = tabs.find((t) => t.primary);
  const colCount = regularTabs.length + (primaryTab ? 1 : 0) + 1;

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--border-brand)] bg-[var(--surface)]/95 backdrop-blur-md shadow-[0_-8px_32px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
      data-testid="mobile-bottom-tab-bar"
    >
      <div
        className="grid h-[3.75rem] items-stretch px-1"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {primaryTab ? (
          <>
            {regularTabs.slice(0, 2).map((tab) => renderTab(tab, pathname))}
            {renderPrimary(primaryTab, brandColor)}
            {regularTabs.slice(2).map((tab) => renderTab(tab, pathname))}
          </>
        ) : (
          regularTabs.map((tab) => renderTab(tab, pathname))
        )}

        <button
          type="button"
          onClick={onMoreClick}
          data-testid="mobile-tab-more"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-xl mx-0.5 touch-manipulation transition-colors min-h-[3rem]",
            moreActive
              ? "text-[var(--brand-text)] bg-[var(--brand-light)]/50"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
          )}
        >
          <LayoutGrid className={cn("h-5 w-5 shrink-0", moreActive && "text-[var(--brand)]")} aria-hidden />
          <span className="text-[10px] font-bold leading-none tracking-tight">{moreLabel}</span>
        </button>
      </div>
    </nav>
  );
}
