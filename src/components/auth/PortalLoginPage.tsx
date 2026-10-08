"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { LoginFormCard } from "@/components/brand/LoginFormCard";
import { LoginMobileShell } from "@/components/brand/LoginMobileShell";
import { LoginHeroPanel, LoginHeroTablet } from "@/components/brand/LoginHeroPanel";
import { isLocalDev } from "@/lib/env";
import type { LoginPortal } from "@/lib/login-portal";
import { storeLoginPortal } from "@/lib/login-portal";

type Props = {
  portal: LoginPortal;
  titleKey: "employeeSignInTitle" | "managerSignInTitle";
  hintKey: "employeeSignInHint" | "managerSignInHint";
  alternatePortal: LoginPortal;
  alternateHref: string;
  alternateLabelKey: "useManagerSignIn" | "useEmployeeSignIn";
};

export function PortalLoginPage({
  portal,
  titleKey,
  hintKey,
  alternatePortal,
  alternateHref,
  alternateLabelKey,
}: Props) {
  const t = useTranslations("auth");
  const tBrand = useTranslations("brand");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const router = useRouter();

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    router.replace(getHomeForRole(user.role));
  }, [hydrated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, portal);
      storeLoginPortal(portal);
      const next = useAuthStore.getState().user;
      router.push(getHomeForRole(next?.role || "SALON_MANAGER"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("loginFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const formProps = {
    email,
    password,
    error,
    sessionExpired,
    loading,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit: handleSubmit,
  };

  return (
    <div className="pravaah-login-page flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-clip">
      <LoginMobileShell {...formProps} />

      <div className="hidden min-h-[100dvh] w-full flex-1 flex-col bg-[var(--app-bg)] md:flex md:flex-row">
        <LoginHeroTablet />
        <LoginHeroPanel />

        <main className="relative flex min-h-[100dvh] w-full min-w-0 flex-1 flex-col justify-center overflow-x-clip overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 lg:py-12 pravaah-login-form-side">
          <div className="relative z-10 mx-auto w-full max-w-md mp-animate-in lg:max-w-sm">
            <p className="mb-3 text-center text-lg font-black text-[var(--text-primary)]">{t(titleKey)}</p>
            <p className="mb-4 text-center text-xs font-medium text-[var(--text-secondary)]">{t(hintKey)}</p>
            <LoginFormCard {...formProps} />
            <p className="mt-4 text-center text-xs">
              <Link href={alternateHref} className="font-semibold text-[var(--brand-text)] hover:underline">
                {t(alternateLabelKey)}
              </Link>
            </p>
            <p className="mt-4 text-center text-[11px] font-medium text-[var(--text-tertiary)]">{tBrand("taglineShort")}</p>

            {isLocalDev && portal === "employee" && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)] shadow-sm">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <p className="mt-2">Employee app: amit.lithos@demo-brand.local / staff123</p>
              </details>
            )}
            {isLocalDev && portal === "manager" && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)] shadow-sm">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <div className="mt-2 space-y-1">
                  <p>Demo CEO: ceo@demo-brand.local / ceo123</p>
                  <p className="pt-1 text-[var(--text-muted)]">Managers use manager123</p>
                </div>
              </details>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
