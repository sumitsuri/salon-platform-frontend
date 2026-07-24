"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Scissors } from "lucide-react";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";

export default function LoginPage() {
  const t = useTranslations("auth");
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
    <div className="min-h-screen flex flex-col bg-[var(--surface-muted)]">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-[var(--brand-on-brand)] shadow-lg hero-banner">
              <Scissors className="w-7 h-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-[var(--text-primary)] tracking-tight">{t("title")}</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">{t("subtitle")}</p>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{t("email")}</label>
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
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{t("password")}</label>
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
              <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
                {loading ? t("signingIn") : t("signIn")}
              </button>
            </form>
          </div>

          <details className="mt-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-xs text-[var(--text-secondary)]">
            <summary className="font-semibold text-[var(--text-primary)] cursor-pointer">{t("demoAccounts")}</summary>
            <div className="mt-2 space-y-1">
              <p>CEO: ceo@demo-brand.local / ceo123</p>
              <p>Manager: manager.lithos@demo-brand.local / manager123</p>
              <p>Platform: platform@salonplatform.local / admin123</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
