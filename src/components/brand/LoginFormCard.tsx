"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertBanner, btnPrimary, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

type LoginFormCardProps = {
  email: string;
  password: string;
  error: string;
  sessionExpired: boolean;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  compact?: boolean;
};

export function LoginFormCard({
  email,
  password,
  error,
  sessionExpired,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  className,
  compact,
}: LoginFormCardProps) {
  const t = useTranslations("auth");

  return (
    <div
      className={cn(
        "pravaah-form-card bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg",
        compact ? "p-5 border-0 shadow-none bg-[var(--surface)]" : "p-5 sm:p-8",
        className
      )}
    >
      <h2 className={cn("font-bold text-[var(--text-primary)] tracking-tight mb-0.5", compact ? "text-lg" : "text-xl")}>
        {t("welcomeBack")}
      </h2>
      <p className={cn("text-sm text-[var(--text-secondary)]", compact ? "mb-4" : "mb-5 sm:mb-6")}>{t("formHint")}</p>
      <form onSubmit={onSubmit} className={cn(compact ? "space-y-3.5" : "space-y-4")}>
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">{t("email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            className={inputClass}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-sm font-semibold text-[var(--text-primary)]">{t("password")}</label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[var(--brand-text)] hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        {sessionExpired && <AlertBanner variant="warning">{t("sessionExpired")}</AlertBanner>}
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full shadow-md min-h-[48px] text-base`}>
          {loading ? t("signingIn") : t("signIn")}
        </button>
      </form>
    </div>
  );
}
