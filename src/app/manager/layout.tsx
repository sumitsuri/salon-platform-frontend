"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Home, UserPlus, Fingerprint, Sparkles, Scissors, Package, CreditCard, CalendarClock, Contact } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import { AppNavSection, isNavActive, MOBILE_MAIN_PADDING, MOBILE_MAIN_PADDING_FAB } from "@/components/app-nav";
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
          { href: "/manager/customers", label: t("customers"), shortLabel: t("customersShort"), icon: Contact },
        ],
      },
      {
        id: "operations",
        label: t("sectionOperations"),
        items: [
          { href: "/manager/attendance", label: t("staff"), shortLabel: t("staff"), icon: Fingerprint },
          { href: "/manager/inventory", label: t("inventory"), shortLabel: t("stock"), icon: Package },
          { href: "/manager/services", label: t("services"), shortLabel: t("sales"), icon: Scissors },
        ],
      },
      {
        id: "insights",
        label: t("sectionInsights"),
        items: [
          { href: "/manager/insights", label: t("insights"), shortLabel: t("tips"), icon: Sparkles },
        ],
      },
    ];
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

  const isWalkInRoute = pathname.startsWith("/manager/walk-in");

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
      mobileMainPadding={isWalkInRoute ? MOBILE_MAIN_PADDING : MOBILE_MAIN_PADDING_FAB}
      mobileNavFabColor={brandColor}
    >
      {children}
    </EnterpriseAppShell>
  );
}
