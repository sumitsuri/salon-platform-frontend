"use client";

import Link from "next/link";
import { LogOut, Palette, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AppNavInput, AppNavItem, flattenNavItems, toNavSections } from "@/components/app-nav";
import { SidebarBrandFooter } from "@/components/brand/SidebarBrandFooter";

export interface SidebarNavPanelProps {
  nav: AppNavInput;
  isActive: (href: string, exact?: boolean) => boolean;
  brandName: string;
  brandSubtitle: string;
  brandLetter: string;
  brandColor?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSettingsOpen: () => void;
  onLogout: () => void;
  logoutLabel: string;
  activeNavClassName?: string;
  settingsTestId?: string | null;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}

function NavItemLink({
  item,
  collapsed,
  brandColor,
  activeClass,
  inactiveClass,
  navHasSelection,
  itemIsActive,
  onNavigate,
}: {
  item: AppNavItem;
  collapsed: boolean;
  brandColor: string;
  activeClass: string;
  inactiveClass: string;
  navHasSelection: boolean;
  itemIsActive: (href: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const childActive = item.children?.some((child) => itemIsActive(child.href, child.exact));
  const active = itemIsActive(item.href, item.exact) || !!childActive;
  const isFab = item.fab === true;
  // FAB solid CTA is for the mobile floating button only — in the sidebar,
  // use normal active/inactive styles so another route can be selected cleanly.
  const fabActive = isFab && !collapsed && active;
  const showChildren = !collapsed && item.children && item.children.length > 0;

  return (
    <div className="space-y-0.5">
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center text-sm rounded-lg border-l-[3px] transition-colors touch-manipulation min-h-[44px]",
          collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5",
          fabActive
            ? "border-transparent font-semibold text-white shadow-sm my-1"
            : active
              ? activeClass
              : navHasSelection
                ? inactiveClass
                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        )}
        style={fabActive ? { backgroundColor: brandColor } : undefined}
      >
        <Icon className={cn("w-[18px] h-[18px] shrink-0", fabActive ? "opacity-100" : "opacity-90")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>

      {showChildren && (
        <div className="ml-3 space-y-0.5 border-l border-[var(--border)] pl-2">
          {item.children!.map((child) => {
            const childIsActive = itemIsActive(child.href, child.exact);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm transition-colors touch-manipulation min-h-[36px]",
                  childIsActive
                    ? "bg-violet-100 text-violet-800 font-semibold"
                    : navHasSelection
                      ? "text-[var(--text-tertiary)] opacity-70 hover:opacity-100 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNavPanel({
  nav,
  isActive,
  brandName,
  brandSubtitle,
  brandLetter,
  brandColor = "var(--brand)",
  collapsed = false,
  onToggleCollapse,
  onSettingsOpen,
  onLogout,
  logoutLabel,
  activeNavClassName,
  settingsTestId = null,
  onNavigate,
  showCollapseToggle = false,
}: SidebarNavPanelProps) {
  const tCommon = useTranslations("common");
  const activeClass =
    activeNavClassName ??
    "bg-[var(--brand-light)] text-[var(--brand-text)] border-[var(--brand)] font-semibold";

  const inactiveClass =
    "border-transparent text-[var(--text-tertiary)] opacity-70 hover:opacity-100 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";

  const itemIsActive = (href: string, exact?: boolean) => isActive(href, exact);
  const sections = toNavSections(nav);
  const flatItems = flattenNavItems(nav);

  const navHasSelection = flatItems.some(
    (item) =>
      itemIsActive(item.href, item.exact) ||
      item.children?.some((child) => itemIsActive(child.href, child.exact))
  );

  return (
    <>
      <div
        className={cn(
          "flex items-center border-b border-[var(--border)] shrink-0 h-16",
          collapsed ? "justify-center px-2" : "gap-3 px-4"
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {!collapsed && (
          <>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {brandLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-[var(--text-primary)] truncate leading-tight">{brandName}</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate leading-tight">{brandSubtitle}</p>
            </div>
          </>
        )}
        {collapsed && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
            style={{ backgroundColor: brandColor }}
            title={brandName}
          >
            {brandLetter}
          </div>
        )}
        {showCollapseToggle && !collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition shrink-0"
            aria-label={tCommon("collapseSidebar")}
            title={tCommon("collapseSidebar")}
          >
            <PanelLeftClose className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {showCollapseToggle && collapsed && onToggleCollapse && (
        <div className="flex justify-center py-2 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
            aria-label={tCommon("expandSidebar")}
            title={tCommon("expandSidebar")}
          >
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-3">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            className={cn(
              "space-y-0.5",
              collapsed && sectionIndex > 0 && "pt-2 mt-1 border-t border-[var(--border)]"
            )}
          >
            {!collapsed && section.label ? (
              <p className="section-label px-3 pt-1 pb-1.5">{section.label}</p>
            ) : null}
            {section.items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                brandColor={brandColor}
                activeClass={activeClass}
                inactiveClass={inactiveClass}
                navHasSelection={navHasSelection}
                itemIsActive={itemIsActive}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 border-t border-[var(--border)] p-2 space-y-1", collapsed && "px-1.5")}>
        <button
          type="button"
          onClick={() => {
            onSettingsOpen();
            onNavigate?.();
          }}
          {...(settingsTestId ? { "data-testid": settingsTestId } : {})}
          title={collapsed ? tCommon("settings") : undefined}
          className={cn(
            "flex w-full items-center text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors touch-manipulation min-h-[44px]",
            collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
          )}
        >
          <Palette className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>{tCommon("settings")}</span>}
        </button>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? logoutLabel : undefined}
          className={cn(
            "flex w-full items-center text-sm rounded-lg text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors touch-manipulation min-h-[44px]",
            collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>{logoutLabel}</span>}
        </button>
        <SidebarBrandFooter collapsed={collapsed} />
      </div>
    </>
  );
}
