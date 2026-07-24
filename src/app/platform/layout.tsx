"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { EnterpriseAppShell } from "@/components/EnterpriseAppShell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("platform.layout");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const nav = useMemo(
    () => [{ href: "/platform", label: t("tenants"), icon: Building2, exact: true }],
    [t]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== "PLATFORM_SUPER_ADMIN") router.replace("/login");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 animate-pulse" />
          <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "PLATFORM_SUPER_ADMIN") return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <EnterpriseAppShell
      homeHref="/platform"
      homeLabel={t("tenants")}
      brandName={t("title")}
      brandSubtitle={t("subtitle", { name: user.name })}
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
