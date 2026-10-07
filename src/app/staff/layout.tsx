"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Home, Target, TrendingUp, UserCircle } from "lucide-react";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import {
  AppNavSection,
  isNavActive,
  MOBILE_MAIN_PADDING_BOTTOM_TABS,
  type MobileBottomNavConfig,
} from "@/components/app-nav";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("staff.nav");
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
        id: "main",
        items: [
          { href: "/staff", label: t("home"), shortLabel: t("home"), icon: Home, exact: true },
          { href: "/staff/time", label: t("time"), shortLabel: t("timeShort"), icon: Clock },
          { href: "/staff/sales", label: t("sales"), shortLabel: t("salesShort"), icon: TrendingUp },
          { href: "/staff/progress", label: t("progress"), shortLabel: t("progressShort"), icon: Target },
          { href: "/staff/profile", label: t("profile"), shortLabel: t("profileShort"), icon: UserCircle },
        ],
      },
    ];
  }, [t]);

  const mobileBottomNav = useMemo((): MobileBottomNavConfig => {
    return {
      showMoreTab: false,
      moreTabLabel: t("more"),
      menuTitle: t("moreMenu"),
      moreSections: [],
      tabs: [
        { id: "home", href: "/staff", label: t("home"), icon: Home, exact: true },
        { id: "time", href: "/staff/time", label: t("timeShort"), icon: Clock },
        { id: "sales", href: "/staff/sales", label: t("salesShort"), icon: TrendingUp },
        { id: "progress", href: "/staff/progress", label: t("progressShort"), icon: Target },
        { id: "profile", href: "/staff/profile", label: t("profileShort"), icon: UserCircle },
      ],
    };
  }, [t]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "SALON_STAFF") {
      router.replace(getHomeForRole(user.role));
    }
  }, [user, router, hydrated]);

  if (!hydrated) {
    return <AntrahqLoading label={tCommon("loading")} />;
  }

  if (!user || user.role !== "SALON_STAFF") return null;

  const isActive = (href: string, exact?: boolean) => isNavActive(pathname, href, exact);
  const brandColor = resolveAccentColor(themeSettings, user.primaryColor);

  return (
    <EnterpriseAppShell
      homeHref="/staff"
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
