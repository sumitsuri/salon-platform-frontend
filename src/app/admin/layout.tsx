"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, ClipboardList, Building2, LogOut, Sparkles, Scissors, Users, IndianRupee, Package, UserPlus, Megaphone } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { resolveAccentColor, useThemeStore } from "@/lib/theme-store";
import { cn } from "@/lib/utils";
import { SettingsButton, SettingsSheet } from "@/components/SettingsSheet";
import { MobileBottomNav, MOBILE_NAV_MAIN_PADDING } from "@/components/MobileBottomNav";

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)]">
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
    <div className="min-h-screen bg-[var(--surface-muted)] flex flex-col">
      <header className="bg-[var(--header-bg)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-3 sm:px-4 lg:px-6 flex items-center justify-between h-14 max-w-7xl mx-auto w-full min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {(user.tenantName || "A")[0]}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[var(--text-primary)] truncate leading-tight">{user.tenantName}</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate leading-tight">{t("ceo")} · {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SettingsButton onClick={() => setSettingsOpen(true)} />
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              aria-label={tCommon("logout")}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="hidden lg:block bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition",
                  active ? "bg-[var(--brand-light)] text-[var(--brand-text)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className={cn("flex-1 w-full px-3 sm:px-4 lg:px-6 py-4 max-w-7xl mx-auto min-w-0", MOBILE_NAV_MAIN_PADDING)}>
        {children}
      </main>

      <MobileBottomNav items={nav} isActive={isActive} />

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
