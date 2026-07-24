"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";

export default function HomePage() {
  const t = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (user) {
      router.replace(getHomeForRole(user.role));
    } else {
      router.replace("/login");
    }
  }, [user, router, hydrated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-[var(--text-tertiary)]">{t("loading")}</div>
    </div>
  );
}
