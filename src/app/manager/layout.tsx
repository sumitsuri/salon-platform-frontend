"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Home,
  UserPlus,
  Fingerprint,
  Sparkles,
  Scissors,
  Package,
  CreditCard,
  Gift,
  CalendarClock,
  Contact,
  CalendarCheck,
  Receipt,
  Warehouse,
} from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import {
  AppNavSection,
  isNavActive,
  MOBILE_MAIN_PADDING_BOTTOM_TABS,
  type MobileBottomNavConfig,
} from "@/components/app-nav";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("manager.nav");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeSettings = useThemeStore();

  const nav = useMemo((): AppNavSection[] => {
    return [
      {
        id: "home",
        items: [{ href: "/manager", label: t("home"), shortLabel: t("home"), icon: Home, exact: true }],
      },
      {
        id: "front-desk",
        label: t("sectionFrontDesk"),
        items: [
          { href: "/manager/schedule", label: t("schedule"), shortLabel: t("floor"), icon: CalendarClock },
          {
            href: "/manager/walk-in",
            label: t("visits"),
            shortLabel: t("visitsShort"),
            icon: UserPlus,
            fab: true,
            fabHref: "/manager/walk-in?new=1",
          },
          { href: "/manager/memberships", label: t("memberships"), shortLabel: t("member"), icon: CreditCard },
          { href: "/manager/packages", label: t("packages"), shortLabel: t("packagesShort"), icon: Gift },
          { href: "/manager/customers", label: t("customers"), shortLabel: t("customersShort"), icon: Contact },
        ],
      },
      {
        id: "operations",
        label: t("sectionOperations"),
        items: [
          { href: "/manager/attendance", label: t("employees"), shortLabel: t("employeesShort"), icon: Fingerprint },
          { href: "/manager/inventory", label: t("inventory"), shortLabel: t("stock"), icon: Package },
          { href: "/manager/expenditure", label: t("expenditure"), shortLabel: t("expenditureShort"), icon: Receipt },
          { href: "/manager/services", label: t("services"), shortLabel: t("sales"), icon: Scissors },
        ],
      },
      {
        id: "insights",
        label: t("sectionInsights"),
        items: [{ href: "/manager/insights", label: t("insights"), shortLabel: t("tips"), icon: Sparkles }],
      },
    ];
  }, [t]);

  const mobileBottomNav = useMemo((): MobileBottomNavConfig => {
    return {
      moreTabLabel: t("tabMore"),
      menuTitle: t("moreMenuTitle"),
      moreActivePrefixes: [
        "/manager/bookings",
        "/manager/memberships",
        "/manager/walk-in",
        "/manager/services",
        "/manager/insights",
        "/manager/customers",
      ],
      hideBarOnPrefixes: ["/manager/walk-in"],
      tabs: [
        { id: "today", href: "/manager", label: t("tabToday"), icon: Home, exact: true },
        { id: "floor", href: "/manager/schedule", label: t("tabFloor"), icon: CalendarClock },
        {
          id: "stock",
          href: "/manager/stock",
          label: t("tabStock"),
          icon: Warehouse,
          activePrefixes: ["/manager/stock", "/manager/inventory", "/manager/expenditure"],
        },
        { id: "employees", href: "/manager/attendance", label: t("tabEmployees"), icon: Fingerprint },
      ],
      moreSections: [
        {
          id: "front-desk",
          label: t("sectionFrontDesk"),
          links: [
            { href: "/manager/bookings", label: t("bookings"), icon: CalendarCheck, description: t("moreBookingsHint") },
            { href: "/manager/memberships", label: t("memberships"), icon: CreditCard, description: t("moreMemberHint") },
            { href: "/manager/customers", label: t("customers"), icon: Contact, description: t("moreGuestsHint") },
          ],
        },
        {
          id: "operations",
          label: t("sectionOperations"),
          links: [{ href: "/manager/services", label: t("services"), icon: Scissors, description: t("moreSalesHint") }],
        },
        {
          id: "insights",
          label: t("sectionInsights"),
          links: [
            { href: "/manager/insights", label: t("insights"), icon: Sparkles, description: t("moreTipsHint") },
          ],
        },
      ],
    };
  }, [t]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return <AntrahqLoading label={tCommon("loading")} />;
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) => isNavActive(pathname, href, exact);

  const brandColor = resolveAccentColor(themeSettings, user.primaryColor);

  return (
    <EnterpriseAppShell
      homeHref="/manager"
      homeLabel={t("home")}
      brandName={user.branchName || user.tenantName || "Branch"}
      brandSubtitle={user.name}
      brandLetter={(user.branchName || user.tenantName || "S")[0]}
      brandColor={brandColor}
      nav={nav}
      isActive={isActive}
      settingsOpen={settingsOpen}
      onSettingsOpen={setSettingsOpen}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
      logoutLabel={tCommon("logout")}
      mobileMainPadding={MOBILE_MAIN_PADDING_BOTTOM_TABS}
      mobileNavFabColor={brandColor}
      mobileBottomNav={mobileBottomNav}
    >
      {children}
    </EnterpriseAppShell>
  );
}
