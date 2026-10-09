"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, CalendarCheck, Sparkles } from "lucide-react";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";
import { AntrahqLogo } from "@/components/brand/AntrahqLogo";
import { isLocalDev } from "@/lib/env";
import { storeLoginPortal } from "@/lib/login-portal";
import { managerLoginUrl, redirectStaffPortalToEmployeeHost } from "@/lib/app-hosts";
import { cn } from "@/lib/utils";

export function EmployeeLoginPage() {
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
    redirectStaffPortalToEmployeeHost("/employee/login/");
  }, []);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.role === "SALON_STAFF") {
      router.replace("/employee/");
    } else {
      router.replace(getHomeForRole(user.role));
    }
  }, [hydrated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, "employee");
      storeLoginPortal("employee");
      router.push("/employee/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="employee-login-page relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0c1222]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(16, 185, 129, 0.35), transparent 55%), radial-gradient(ellipse 80% 50% at 100% 50%, rgba(59, 130, 246, 0.2), transparent 45%), linear-gradient(180deg, #0c1222 0%, #111827 100%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
          <div className="mb-8 text-center">
            <AntrahqLogo size="sm" variant="light" className="mx-auto opacity-95" />
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t("employeePortalBadge")}
            </p>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white">{t("employeeSignInTitle")}</h1>
            <p className="mt-2 text-sm font-medium text-slate-300">{t("employeeSignInHint")}</p>
          </div>

          <ul className="mb-6 grid grid-cols-2 gap-2 text-left text-xs text-slate-400">
            <li className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <Clock className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              {t("employeeLoginFeatureTime")}
            </li>
            <li className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              {t("employeeLoginFeatureLeave")}
            </li>
          </ul>

          <div className="rounded-2xl border border-white/10 bg-white/[0.97] p-5 shadow-2xl shadow-black/40 sm:p-6">
            {sessionExpired && (
              <div className="mb-4">
                <AlertBanner variant="warning">{t("sessionExpired")}</AlertBanner>
              </div>
            )}
            {error && (
              <div className="mb-4">
                <AlertBanner variant="error">{error}</AlertBanner>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">{t("email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass}
                  placeholder="you@salon.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">{t("password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={cn(btnPrimary, "w-full !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-700")}
              >
                {loading ? t("signingIn") : t("employeeSignInCta")}
              </button>
            </form>
          </div>

          {isLocalDev && (
            <details className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-slate-300">
              <summary className="cursor-pointer font-semibold text-white">{t("demoAccounts")}</summary>
              <p className="mt-2">amit.lithos@demo-brand.local / staff123</p>
            </details>
          )}

          <p className="mt-auto pt-6 text-center text-[11px] leading-relaxed text-slate-500">
            {t("employeeLoginManagerHint")}{" "}
            <Link href={managerLoginUrl()} className="font-semibold text-slate-300 underline-offset-2 hover:underline">
              {t("managerSignInShort")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
