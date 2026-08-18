"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("resetTokenMissing"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--app-bg)] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg sm:p-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("resetPasswordTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("resetPasswordHint")}</p>

        {!token && !success && (
          <div className="mt-6">
            <AlertBanner variant="error">{t("resetTokenMissing")}</AlertBanner>
            <p className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="font-semibold text-[var(--brand-text)] hover:underline">
                {t("forgotPasswordTitle")}
              </Link>
            </p>
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">{t("newPassword")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {success && <AlertBanner variant="success">{t("passwordUpdated")}</AlertBanner>}
            {error && <AlertBanner variant="error">{error}</AlertBanner>}

            <button type="submit" disabled={loading || success} className={`${btnPrimary} w-full min-h-[48px]`}>
              {loading ? t("updatingPassword") : t("updatePassword")}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-semibold text-[var(--brand-text)] hover:underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
