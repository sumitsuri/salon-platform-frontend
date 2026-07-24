"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";
import { LoginHeroPanel } from "@/components/brand/LoginHeroPanel";
import { PravaahLogo } from "@/components/brand/PravaahLogo";

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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--app-bg)]">
      <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
        <LoginHeroPanel />

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 min-h-0 relative overflow-hidden pravaah-login-form-side">
          <div className="pravaah-form-orb pravaah-form-orb-1" aria-hidden />
          <div className="pravaah-form-orb pravaah-form-orb-2" aria-hidden />

          <div className="w-full max-w-sm mp-animate-in relative z-10">
            <div className="lg:hidden mb-6 flex justify-center">
              <PravaahLogo size="md" variant="dark" />
            </div>

            <div className="pravaah-form-card bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg p-6 sm:p-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">{t("welcomeBack")}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">{t("formHint")}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">{t("email")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">{t("password")}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>
                {sessionExpired && <AlertBanner variant="warning">{t("sessionExpired")}</AlertBanner>}
                {error && <AlertBanner variant="error">{error}</AlertBanner>}
                <button type="submit" disabled={loading} className={`${btnPrimary} w-full shadow-md`}>
                  {loading ? t("signingIn") : t("signIn")}
                </button>
              </form>
            </div>

            <p className="mt-4 text-center text-[11px] text-[var(--text-tertiary)] font-medium">{tBrand("taglineShort")}</p>

            <details className="mt-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-xs text-[var(--text-secondary)] shadow-sm">
              <summary className="font-semibold text-[var(--text-primary)] cursor-pointer">{t("demoAccounts")}</summary>
              <div className="mt-2 space-y-1">
                <p>Platform: platform@salonplatform.local / admin123</p>
                <p>Demo CEO: ceo@demo-brand.local / ceo123</p>
                <p>Velvet CEO: ceo@velvet-scissors.local / ceo123</p>
                <p>Bloom CEO: ceo@bloom-beauty.local / ceo123</p>
                <p>Crown CEO: ceo@crown-comb.local / ceo123</p>
                <p className="pt-1 text-[var(--text-muted)]">All managers use manager123 — full list in docs/DEMO_CREDENTIALS.md</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
