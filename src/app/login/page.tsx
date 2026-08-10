"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { LoginFormCard } from "@/components/brand/LoginFormCard";
import { LoginMobileShell } from "@/components/brand/LoginMobileShell";
import { LoginHeroPanel, LoginHeroTablet } from "@/components/brand/LoginHeroPanel";
import { isLocalDev } from "@/lib/env";

export default function LoginPage() {
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
      await login(email, password);
      const user = useAuthStore.getState().user;
      router.push(getHomeForRole(user?.role || "SALON_MANAGER"));
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
    <div className="pravaah-login-page w-full max-w-full overflow-x-clip">
      <LoginMobileShell {...formProps} />

      <div className="hidden min-h-[100dvh] flex-col bg-[var(--app-bg)] md:flex md:flex-row">
        <LoginHeroTablet />
        <LoginHeroPanel />

        <main className="relative flex flex-1 flex-col justify-center overflow-x-clip overflow-y-auto px-8 py-8 lg:p-12 min-w-0 pravaah-login-form-side">
          <div className="pravaah-form-orb pravaah-form-orb-1" aria-hidden />
          <div className="pravaah-form-orb pravaah-form-orb-2" aria-hidden />

          <div className="relative z-10 mx-auto w-full max-w-sm mp-animate-in">
            <LoginFormCard {...formProps} />

            <p className="mt-4 text-center text-[11px] font-medium text-[var(--text-tertiary)]">{tBrand("taglineShort")}</p>

            {isLocalDev && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)] shadow-sm">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <div className="mt-2 space-y-1">
                  <p>Platform: platform@salonplatform.local / admin123</p>
                  <p>Sales rep: sales1@antrahq.local / sales123</p>
                  <p>Demo CEO: ceo@demo-brand.local / ceo123</p>
                  <p>Velvet CEO: ceo@velvet-scissors.local / ceo123</p>
                  <p>Bloom CEO: ceo@bloom-beauty.local / ceo123</p>
                  <p>Crown CEO: ceo@crown-comb.local / ceo123</p>
                  <p className="pt-1 text-[var(--text-muted)]">All managers use manager123 — full list in docs/DEMO_CREDENTIALS.md</p>
                </div>
              </details>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
