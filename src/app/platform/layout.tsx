"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Building2, Kanban } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { isNavActive } from "@/components/app-nav";

const PLATFORM_ROLES = new Set(["PLATFORM_SUPER_ADMIN", "SALES_EXECUTIVE"]);

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("platform.layout");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isAdmin = user?.role === "PLATFORM_SUPER_ADMIN";

  const nav = useMemo(() => {
    if (isAdmin) {
      return [
        { href: "/platform/overview", label: "Overview", icon: BarChart3, exact: true },
        { href: "/platform", label: t("tenants"), icon: Building2, exact: true },
        {
          href: "/platform/sales",
          label: "Sales",
          icon: Kanban,
          children: [
            { href: "/platform/sales", label: "Pipeline", exact: true },
            { href: "/platform/sales/incoming", label: "Incoming leads" },
            { href: "/platform/sales/team", label: "Team" },
          ],
        },
      ];
    }
    return [
      {
        href: "/platform/sales",
        label: "Sales",
        icon: Kanban,
        children: [
          { href: "/platform/sales", label: "My Pipeline", exact: true },
          { href: "/platform/sales/growth", label: "My Progress" },
        ],
      },
    ];
  }, [t, isAdmin]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !PLATFORM_ROLES.has(user.role)) {
      router.replace("/login");
      return;
    }
    if (user.role === "SALES_EXECUTIVE" && isNavActive(pathname, "/platform", true)) {
      router.replace("/platform/sales");
    }
    if (user.role === "SALES_EXECUTIVE" && isNavActive(pathname, "/platform/overview", true)) {
      router.replace("/platform/sales");
    }
    if (user.role === "SALES_EXECUTIVE" && isNavActive(pathname, "/platform/sales/team")) {
      router.replace("/platform/sales");
    }
    if (user.role === "SALES_EXECUTIVE" && isNavActive(pathname, "/platform/sales/incoming")) {
      router.replace("/platform/sales");
    }
  }, [user, router, hydrated, pathname]);

  if (!hydrated) {
    return <AntrahqLoading label={tCommon("loading")} />;
  }

  if (!user || !PLATFORM_ROLES.has(user.role)) return null;

  const isActive = (href: string, exact?: boolean) => isNavActive(pathname, href, exact);

  return (
    <EnterpriseAppShell
      homeHref={isAdmin ? "/platform/overview" : "/platform/sales"}
      homeLabel={isAdmin ? "Overview" : "Sales"}
      brandName={isAdmin ? t("title") : "Antrahq Sales"}
      brandSubtitle={
        isAdmin
          ? t("subtitle", { name: user.name })
          : `Field sales · ${user.name}`
      }
      brandLetter="P"
      brandColor="#7c3aed"
      nav={nav}
      isActive={isActive}
      settingsOpen={settingsOpen}
      onSettingsOpen={setSettingsOpen}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
      logoutLabel={tCommon("logout")}
      activeNavClassName="bg-violet-600 text-white border-violet-600 font-semibold"
    >
      {children}
    </EnterpriseAppShell>
  );
}
