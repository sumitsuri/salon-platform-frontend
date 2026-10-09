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
import { consumeLoginPortal } from "@/lib/login-portal";
import { EmployeeHostRedirect } from "@/components/auth/EmployeeHostRedirect";
import { employeeLoginPath } from "@/lib/app-hosts";

function isEmployeeLoginPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/employee/login" || pathname.startsWith("/employee/login/");
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("employee.nav");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeSettings = useThemeStore();
  const onLoginPage = isEmployeeLoginPath(pathname);

  const nav = useMemo((): AppNavSection[] => {
    return [
      {
        id: "main",
        items: [
          { href: "/employee", label: t("home"), shortLabel: t("home"), icon: Home, exact: true },
          { href: "/employee/time", label: t("time"), shortLabel: t("timeShort"), icon: Clock },
          { href: "/employee/sales", label: t("sales"), shortLabel: t("salesShort"), icon: TrendingUp },
          { href: "/employee/progress", label: t("progress"), shortLabel: t("progressShort"), icon: Target },
          { href: "/employee/profile", label: t("profile"), shortLabel: t("profileShort"), icon: UserCircle },
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
        { id: "home", href: "/employee", label: t("home"), icon: Home, exact: true },
        { id: "time", href: "/employee/time", label: t("timeShort"), icon: Clock },
        { id: "sales", href: "/employee/sales", label: t("salesShort"), icon: TrendingUp },
        { id: "progress", href: "/employee/progress", label: t("progressShort"), icon: Target },
        { id: "profile", href: "/employee/profile", label: t("profileShort"), icon: UserCircle },
      ],
    };
  }, [t]);

  useEffect(() => {
    if (onLoginPage || !hydrated) return;
    if (!user) {
      router.replace(`${employeeLoginPath()}?expired=1`);
      return;
    }
    if (user.role !== "SALON_STAFF") {
      router.replace(getHomeForRole(user.role));
    }
  }, [user, router, hydrated, onLoginPage]);

  if (onLoginPage) {
    return (
      <>
        <EmployeeHostRedirect />
        {children}
      </>
    );
  }

  if (!hydrated) {
    return <AntrahqLoading label={tCommon("loading")} />;
  }

  if (!user || user.role !== "SALON_STAFF") return null;

  const isActive = (href: string, exact?: boolean) => isNavActive(pathname, href, exact);
  const brandColor = resolveAccentColor(themeSettings, user.primaryColor);

  return (
    <>
      <EmployeeHostRedirect />
    <EnterpriseAppShell
      homeHref="/employee"
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
        consumeLoginPortal();
        router.push(employeeLoginPath());
      }}
      logoutLabel={tCommon("logout")}
      mobileMainPadding={MOBILE_MAIN_PADDING_BOTTOM_TABS}
      mobileNavFabColor={brandColor}
      mobileBottomNav={mobileBottomNav}
    >
      {children}
    </EnterpriseAppShell>
    </>
  );
}
