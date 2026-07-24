"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, ClipboardList, Building2, Sparkles, Scissors, Users, IndianRupee, Package, UserPlus, Megaphone } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import { MOBILE_MAIN_PADDING } from "@/components/app-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.layout");
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
      { href: "/admin", label: t("nav.overview"), shortLabel: t("nav.home"), icon: LayoutDashboard, exact: true },
      { href: "/admin/insights", label: t("nav.insights"), shortLabel: t("nav.tips"), icon: Sparkles },
      { href: "/admin/services", label: t("nav.services"), shortLabel: t("nav.sales"), icon: Scissors },
      { href: "/admin/bookings", label: t("nav.bookings"), shortLabel: t("nav.book"), icon: ClipboardList },
      { href: "/admin/leads", label: t("nav.leads"), shortLabel: t("nav.leads"), icon: UserPlus },
      { href: "/admin/campaigns", label: t("nav.campaigns"), shortLabel: t("nav.promo"), icon: Megaphone },
      { href: "/admin/employees", label: t("nav.employees"), shortLabel: t("nav.staff"), icon: Users },
      { href: "/admin/finance", label: t("nav.finance"), shortLabel: t("nav.pl"), icon: IndianRupee },
      { href: "/admin/inventory", label: t("nav.inventory"), shortLabel: t("nav.stock"), icon: Package },
      { href: "/admin/branches", label: t("nav.organization"), shortLabel: t("nav.org"), icon: Building2 },
    ],
    [t]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== "BRAND_ADMIN" && user.role !== "PLATFORM_SUPER_ADMIN") router.replace("/manager");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand)] animate-pulse" />
          <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "BRAND_ADMIN" && user.role !== "PLATFORM_SUPER_ADMIN")) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const brandColor = resolveAccentColor(themeSettings, user.primaryColor);

  return (
    <EnterpriseAppShell
      homeHref="/admin"
      homeLabel={t("nav.overview")}
      brandName={user.tenantName || "Admin"}
      brandSubtitle={`${t("ceo")} · ${user.name}`}
      brandLetter={(user.tenantName || "A")[0]}
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
      mobileMainPadding={MOBILE_MAIN_PADDING}
    >
      {children}
    </EnterpriseAppShell>
  );
}
