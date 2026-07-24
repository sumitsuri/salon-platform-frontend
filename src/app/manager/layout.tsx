"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Home, UserPlus, ClipboardList, Fingerprint, Sparkles, Scissors, Package } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import { MOBILE_MAIN_PADDING_FAB } from "@/components/app-nav";
import { PravaahLoading } from "@/components/brand/PravaahLoading";

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

  const nav = useMemo(
    () => [
      { href: "/manager", label: t("home"), shortLabel: t("home"), icon: Home, exact: true },
      { href: "/manager/attendance", label: t("staff"), shortLabel: t("staff"), icon: Fingerprint },
      { href: "/manager/walk-in", label: t("walkIn"), shortLabel: t("walkIn"), icon: UserPlus, fab: true },
      { href: "/manager/bookings", label: t("bookings"), shortLabel: t("book"), icon: ClipboardList },
      { href: "/manager/inventory", label: t("inventory"), shortLabel: t("stock"), icon: Package },
      { href: "/manager/insights", label: t("insights"), shortLabel: t("tips"), icon: Sparkles },
      { href: "/manager/services", label: t("services"), shortLabel: t("sales"), icon: Scissors },
    ],
    [t]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return <PravaahLoading label={tCommon("loading")} />;
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

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
      mobileMainPadding={MOBILE_MAIN_PADDING_FAB}
      mobileNavFabColor={brandColor}
    >
      {children}
    </EnterpriseAppShell>
  );
}
