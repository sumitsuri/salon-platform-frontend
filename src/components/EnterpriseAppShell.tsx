"use client";

import Link from "next/link";
import { ChevronLeft, LogOut, Menu } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AppShellProvider } from "@/lib/app-shell-context";
import { BreadcrumbProvider, useBreadcrumbs } from "@/lib/breadcrumb-context";
import { useSidebarCollapsed } from "@/lib/sidebar-state";
import { SettingsButton, SettingsSheet } from "@/components/SettingsSheet";
import { AppNavItem, MOBILE_MAIN_PADDING, MOBILE_TOP_BAR_OFFSET } from "@/components/app-nav";
import { MobilePrimaryFab } from "@/components/MobilePrimaryFab";
import { SidebarNavPanel } from "@/components/SidebarNavPanel";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export interface EnterpriseAppShellProps {
  homeHref: string;
  homeLabel: string;
  brandName: string;
  brandSubtitle: string;
  brandLetter: string;
  brandColor?: string;
  nav: AppNavItem[];
  isActive: (href: string, exact?: boolean) => boolean;
  children: React.ReactNode;
  settingsOpen: boolean;
  onSettingsOpen: (open: boolean) => void;
  onLogout: () => void;
  logoutLabel: string;
  mobileMainPadding?: string;
  mobileNavFabColor?: string;
  activeNavClassName?: string;
}

const SIDEBAR_MQ = "(min-width: 768px)";

function subscribeSidebarLayout(cb: () => void) {
  const mq = window.matchMedia(SIDEBAR_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getSidebarLayout() {
  return window.matchMedia(SIDEBAR_MQ).matches;
}

function useSidebarLayout() {
  return useSyncExternalStore(subscribeSidebarLayout, getSidebarLayout, () => false);
}

function MobileTopBar({
  homeHref,
  homeLabel,
  brandName,
  brandSubtitle,
  brandLetter,
  brandColor,
  onOpenMenu,
  onSettingsOpen,
  onLogout,
  logoutLabel,
  usesSidebar,
  drawerOpen,
}: {
  homeHref: string;
  homeLabel: string;
  brandName: string;
  brandSubtitle: string;
  brandLetter: string;
  brandColor?: string;
  onOpenMenu: () => void;
  onSettingsOpen: (open: boolean) => void;
  onLogout: () => void;
  logoutLabel: string;
  usesSidebar: boolean;
  drawerOpen: boolean;
}) {
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs();
  const isSubPage = pathname !== homeHref;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 bg-[var(--header-bg)] border-b border-[var(--border)] shadow-sm md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-between h-14 px-3 w-full gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            data-testid="mobile-menu-button"
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] touch-manipulation shrink-0"
            aria-label={tCommon("openMenu")}
          >
            <Menu className="w-5 h-5" />
          </button>

          {breadcrumbs.length > 0 ? (
            <Breadcrumbs items={breadcrumbs} compact testId="mobile-breadcrumbs" className="min-w-0 flex-1" />
          ) : isSubPage ? (
            <Link
              href={homeHref}
              data-testid="mobile-back-link"
              className="flex items-center gap-0.5 min-w-0 text-[var(--brand-text)] font-semibold text-sm touch-manipulation py-2"
            >
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="truncate">{tCommon("backTo", { page: homeLabel })}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {brandLetter}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{brandName}</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">{brandSubtitle}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <SettingsButton
            onClick={() => onSettingsOpen(true)}
            testId={usesSidebar || drawerOpen ? null : "settings-button"}
          />
          <button
            type="button"
            onClick={onLogout}
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition touch-manipulation"
            aria-label={logoutLabel}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function EnterpriseAppShell({
  homeHref,
  homeLabel,
  brandName,
  brandSubtitle,
  brandLetter,
  brandColor = "var(--brand)",
  nav,
  isActive,
  children,
  settingsOpen,
  onSettingsOpen,
  onLogout,
  logoutLabel,
  mobileMainPadding = MOBILE_MAIN_PADDING,
  mobileNavFabColor,
  activeNavClassName,
}: EnterpriseAppShellProps) {
  const usesSidebar = useSidebarLayout();
  const { collapsed, toggle, ready } = useSidebarCollapsed();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  const sidebarWidth = collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)";

  const panelProps = {
    nav,
    isActive,
    brandName,
    brandSubtitle,
    brandLetter,
    brandColor,
    onSettingsOpen: () => onSettingsOpen(true),
    onLogout,
    logoutLabel,
    activeNavClassName,
  };

  return (
    <AppShellProvider homeHref={homeHref} homeLabel={homeLabel}>
      <BreadcrumbProvider nav={nav} homeHref={homeHref} homeLabel={homeLabel}>
        <div className="min-h-screen bg-[var(--app-bg)] flex">
          <aside
            className={cn(
              "enterprise-sidebar hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 transition-[width] duration-200 ease-out",
              ready ? undefined : "md:w-[var(--sidebar-width)]"
            )}
            style={ready && usesSidebar ? { width: sidebarWidth } : undefined}
            aria-label="Primary navigation"
            data-collapsed={collapsed ? "true" : "false"}
          >
            <SidebarNavPanel
              {...panelProps}
              collapsed={collapsed}
              onToggleCollapse={toggle}
              showCollapseToggle
              settingsTestId={usesSidebar ? "settings-button" : null}
            />
          </aside>

          <div
            className="flex-1 flex flex-col min-h-screen min-w-0 transition-[padding-left] duration-200 ease-out md:pl-[var(--sidebar-current-width)]"
            style={
              { "--sidebar-current-width": ready && usesSidebar ? sidebarWidth : "0px" } as React.CSSProperties
            }
          >
            <MobileTopBar
              homeHref={homeHref}
              homeLabel={homeLabel}
              brandName={brandName}
              brandSubtitle={brandSubtitle}
              brandLetter={brandLetter}
              brandColor={brandColor}
              onOpenMenu={() => setMobileDrawerOpen(true)}
              onSettingsOpen={onSettingsOpen}
              onLogout={onLogout}
              logoutLabel={logoutLabel}
              usesSidebar={usesSidebar}
              drawerOpen={mobileDrawerOpen}
            />

            <main
              className={cn(
                "flex-1 w-full px-4 sm:px-6 md:px-6 lg:px-8 pb-4 sm:pb-5 md:py-6 min-w-0",
                MOBILE_TOP_BAR_OFFSET,
                mobileMainPadding
              )}
            >
              <div className="w-full max-w-[1920px] mx-auto">{children}</div>
            </main>
          </div>

          <MobileNavDrawer open={mobileDrawerOpen} onClose={closeDrawer} {...panelProps} />
          <MobilePrimaryFab items={nav} color={mobileNavFabColor ?? brandColor} hidden={mobileDrawerOpen} />
          <SettingsSheet open={settingsOpen} onClose={() => onSettingsOpen(false)} />
        </div>
      </BreadcrumbProvider>
    </AppShellProvider>
  );
}
