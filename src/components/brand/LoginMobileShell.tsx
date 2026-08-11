"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { AntrahqLogo } from "./AntrahqLogo";
import { LoginFormCard } from "./LoginFormCard";
import { isLocalDev } from "@/lib/env";
import { cn } from "@/lib/utils";

type LoginMobileShellProps = {
  email: string;
  password: string;
  error: string;
  sessionExpired: boolean;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function LoginMobileShell({ className, ...props }: LoginMobileShellProps & { className?: string }) {
  const t = useTranslations("auth");

  return (
    <div className={cn("pravaah-login-mobile relative flex min-h-[100dvh] w-full flex-col overflow-hidden md:hidden", className)}>
      <div className="pravaah-login-bg absolute inset-0" aria-hidden />
      <div className="pravaah-orb pravaah-orb-1 pravaah-login-mobile-orb-1" aria-hidden />
      <div className="pravaah-orb pravaah-orb-2 pravaah-login-mobile-orb-2" aria-hidden />
      <div className="pravaah-orb pravaah-orb-3 pravaah-login-mobile-orb-3" aria-hidden />

      <div className="relative z-10 grid min-h-[100dvh] grid-rows-[auto_1fr]">
        <div className="flex shrink-0 flex-col items-center px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-center">
          <AntrahqLogo size="md" variant="light" />
        </div>

        <div className="pravaah-login-sheet flex min-h-0 flex-col px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]/40" aria-hidden />

          <div className="mp-animate-in mx-auto flex w-full max-w-sm flex-1 flex-col">
            <LoginFormCard {...props} compact />

            {isLocalDev && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs text-[var(--text-secondary)]">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <div className="mt-2 space-y-1">
                  <p>Platform: platform@salonplatform.local / admin123</p>
                  <p>Sales rep: sales1@antrahq.local / sales123</p>
                  <p>Demo CEO: ceo@demo-brand.local / ceo123</p>
                  <p className="pt-1 text-[var(--text-muted)]">Managers: manager123 — see docs/DEMO_CREDENTIALS.md</p>
                </div>
              </details>
            )}

            <p className="mt-auto pt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("workspaceSecurity")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
