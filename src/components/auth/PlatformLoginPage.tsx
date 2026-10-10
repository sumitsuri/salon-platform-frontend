"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { LoginFormCard } from "@/components/brand/LoginFormCard";
import { LoginMobileShell } from "@/components/brand/LoginMobileShell";
import { LoginHeroPanel, LoginHeroTablet } from "@/components/brand/LoginHeroPanel";
import { isLocalDev } from "@/lib/env";
import { storeLoginPortal } from "@/lib/login-portal";
import { employeeLoginUrl, managerLoginUrl } from "@/lib/app-hosts";
import { navigateToRoleHome } from "@/lib/role-home";
import { isPlatformRole } from "@/lib/platform-roles";

/** Platform admin / sales login (platform.antrahq.com). */
export function PlatformLoginPage() {
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
    if (isPlatformRole(user.role)) {
      navigateToRoleHome(user.role, router);
    } else {
      useAuthStore.getState().logout();
      setError(t("platformWrongAccount"));
    }
  }, [hydrated, user, router, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, "admin");
      storeLoginPortal("admin");
      const next = useAuthStore.getState().user;
      if (!next || !isPlatformRole(next.role)) {
        useAuthStore.getState().logout();
        setError(t("platformWrongAccount"));
        return;
      }
      navigateToRoleHome(next.role, router);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
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
      <p className="md:hidden px-5 pb-4 text-center text-xs text-[var(--text-secondary)]">
        {t("platformLoginSalonHint")}{" "}
        <Link href={managerLoginUrl()} className="font-semibold text-[var(--brand-text)] hover:underline">
          {t("managerSignInShort")}
        </Link>
        {" · "}
        <Link href={employeeLoginUrl()} className="font-semibold text-[var(--brand-text)] hover:underline">
          {t("employeeSignInShort")}
        </Link>
      </p>

      <div className="hidden min-h-[100dvh] w-full flex-1 flex-col bg-[var(--app-bg)] md:flex md:flex-row">
        <LoginHeroTablet />
        <LoginHeroPanel />

        <main className="relative flex min-h-[100dvh] w-full min-w-0 flex-1 flex-col justify-center overflow-x-clip overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 lg:py-12 pravaah-login-form-side">
          <div className="relative z-10 mx-auto w-full max-w-md mp-animate-in lg:max-w-sm">
            <p className="mb-3 text-center text-lg font-black text-[var(--text-primary)]">{t("platformSignInTitle")}</p>
            <p className="mb-4 text-center text-xs font-medium text-[var(--text-secondary)]">{t("platformSignInHint")}</p>
            <LoginFormCard {...formProps} />
            <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">
              {t("platformLoginSalonHint")}{" "}
              <Link href={managerLoginUrl()} className="font-semibold text-[var(--brand-text)] hover:underline">
                {t("managerSignInShort")}
              </Link>
            </p>
            <p className="mt-4 text-center text-[11px] font-medium text-[var(--text-tertiary)]">{tBrand("taglineShort")}</p>

            {isLocalDev && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)] shadow-sm">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <div className="mt-2 space-y-1">
                  <p>Platform admin uses admin portal on platform host.</p>
                </div>
              </details>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
