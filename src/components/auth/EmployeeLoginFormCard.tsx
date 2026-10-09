"use client";

import { useTranslations } from "next-intl";
import { AlertBanner, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
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

export function EmployeeLoginFormCard({
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
}: Props) {
  const t = useTranslations("auth");

  return (
    <div
      className={cn(
        "pravaah-form-card bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg",
        compact ? "p-5 border-0 shadow-none bg-[var(--surface)]" : "p-5 sm:p-8",
        className,
      )}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-600">{t("employeePortalBadge")}</p>
      <h2 className={cn("font-bold text-[var(--text-primary)] tracking-tight mb-0.5", compact ? "text-lg" : "text-xl")}>
        {t("employeeSignInTitle")}
      </h2>
      <p className={cn("text-sm text-[var(--text-secondary)]", compact ? "mb-4" : "mb-5 sm:mb-6")}>
        {t("employeeFormHint")}
      </p>
      <form onSubmit={onSubmit} className={cn(compact ? "space-y-3.5" : "space-y-4")}>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">{t("email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
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
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        {sessionExpired && <AlertBanner variant="warning">{t("sessionExpired")}</AlertBanner>}
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <button
          type="submit"
          disabled={loading}
          className="employee-login-btn w-full min-h-[48px] rounded-xl border px-4 text-base font-bold shadow-md transition disabled:opacity-60"
        >
          {loading ? t("signingIn") : t("employeeSignInCta")}
        </button>
      </form>
    </div>
  );
}
