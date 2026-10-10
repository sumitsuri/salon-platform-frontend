"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { isEmployeeAppHost, isManagerAppHost, isPlatformAppHost, managerLoginPath } from "@/lib/app-hosts";
import { navigateToRoleHome } from "@/lib/role-home";
import { EmployeeLoginPage } from "@/components/auth/EmployeeLoginPage";
import { PlatformLoginPage } from "@/components/auth/PlatformLoginPage";

export default function HomePage() {
  const t = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const router = useRouter();
  const [hostReady, setHostReady] = useState(false);

  useEffect(() => {
    setHostReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !hostReady) return;

    if (isEmployeeAppHost()) {
      if (user) {
        navigateToRoleHome(user.role, router);
      }
      return;
    }

    if (isPlatformAppHost()) {
      if (user) {
        navigateToRoleHome(user.role, router);
      }
      return;
    }

    if (user) {
      navigateToRoleHome(user.role, router);
    } else if (isManagerAppHost() || !isEmployeeAppHost()) {
      router.replace(managerLoginPath());
    }
  }, [user, router, hydrated, hostReady]);

  if (!hostReady || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-tertiary)]">{t("loading")}</div>
      </div>
    );
  }

  if (isEmployeeAppHost() && !user) {
    return <EmployeeLoginPage />;
  }

  if (isPlatformAppHost() && !user) {
    return <PlatformLoginPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-[var(--text-tertiary)]">{t("loading")}</div>
    </div>
  );
}
