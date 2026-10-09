"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore, useAuthHydrated, getHomeForRole } from "@/lib/auth-store";
import { isLocalDev } from "@/lib/env";
import { storeLoginPortal } from "@/lib/login-portal";
import { managerLoginUrl, redirectStaffPortalToEmployeeHost } from "@/lib/app-hosts";
import { EmployeeLoginMobileShell } from "./EmployeeLoginMobileShell";
import { EmployeeLoginHeroPanel, EmployeeLoginHeroTablet } from "./EmployeeLoginHeroPanel";
import { EmployeeLoginFormCard } from "./EmployeeLoginFormCard";

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
    const path = window.location.pathname;
    if (path.startsWith("/employee/login")) {
      redirectStaffPortalToEmployeeHost(path);
    }
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
    <div className="employee-login-page flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-clip">
      <EmployeeLoginMobileShell {...formProps} />

      <div className="hidden min-h-[100dvh] w-full flex-1 flex-col bg-[var(--app-bg)] md:flex md:flex-row">
        <EmployeeLoginHeroTablet />
        <EmployeeLoginHeroPanel />

        <main className="employee-login-form-side relative flex min-h-[100dvh] w-full min-w-0 flex-1 flex-col justify-center overflow-x-clip overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="relative z-10 mx-auto w-full max-w-md mp-animate-in lg:max-w-sm">
            <EmployeeLoginFormCard {...formProps} />

            <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">
              {t("employeeLoginManagerHint")}{" "}
              <Link href={managerLoginUrl()} className="font-semibold text-teal-700 hover:underline">
                {t("managerSignInShort")}
              </Link>
            </p>

            {isLocalDev && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)] shadow-sm">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <p className="mt-2">amit.lithos@demo-brand.local / staff123</p>
              </details>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
