"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--app-bg)] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg sm:p-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("forgotPasswordTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("forgotPasswordHint")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {success && <AlertBanner variant="success">{t("resetLinkSent")}</AlertBanner>}
          {error && <AlertBanner variant="error">{error}</AlertBanner>}

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full min-h-[48px]`}>
            {loading ? t("sendingResetLink") : t("sendResetLink")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-semibold text-[var(--brand-text)] hover:underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
