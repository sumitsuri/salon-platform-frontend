"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { AntrahqLogo } from "@/components/brand/AntrahqLogo";
import { EmployeeLoginFormCard } from "./EmployeeLoginFormCard";
import { EmployeeLoginShowcase, type EmployeeShowcaseSlide } from "./EmployeeLoginShowcase";
import { isLocalDev } from "@/lib/env";
import { managerLoginUrl } from "@/lib/app-hosts";
import { cn } from "@/lib/utils";

const SLIDES: EmployeeShowcaseSlide[] = ["punch", "sales", "reviews"];

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
};

export function EmployeeLoginMobileShell({ className, ...props }: Props) {
  const t = useTranslations("auth");
  const tHero = useTranslations("auth.employeeHero");
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("employee-login-mobile relative flex min-h-[100dvh] w-full flex-col overflow-hidden md:hidden", className)}>
      <div className="employee-login-bg absolute inset-0" aria-hidden />
      <div className="employee-login-orb w-52 h-52 -top-12 -right-10 opacity-45" aria-hidden />
      <div className="employee-login-orb w-40 h-40 top-[22%] -left-14 opacity-35" aria-hidden />

      <div className="relative z-10 grid min-h-[100dvh] grid-rows-[auto_1fr]">
        <div className="flex shrink-0 flex-col items-center px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-center">
          <AntrahqLogo size="md" variant="light" />
          <p className="mt-3 max-w-xs text-sm font-medium leading-snug text-white/90">{tHero("tagline")}</p>
          <div className="mt-3">
            <EmployeeLoginShowcase slide={SLIDES[slideIdx]} compact />
          </div>
        </div>

        <div className="pravaah-login-sheet flex min-h-0 flex-col px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]/40" aria-hidden />

          <div className="mp-animate-in mx-auto flex w-full max-w-sm flex-1 flex-col">
            <EmployeeLoginFormCard {...props} compact />

            {isLocalDev && (
              <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs text-[var(--text-secondary)]">
                <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("demoAccounts")}</summary>
                <p className="mt-2">amit.lithos@demo-brand.local / staff123</p>
              </details>
            )}

            <p className="mt-3 text-center text-[11px] text-[var(--text-secondary)]">
              {t("employeeLoginManagerHint")}{" "}
              <Link href={managerLoginUrl()} className="font-semibold text-teal-700 hover:underline">
                {t("managerSignInShort")}
              </Link>
            </p>

            <p className="mt-auto flex items-center justify-center gap-1.5 pt-4 text-[11px] font-medium text-[var(--text-tertiary)]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("workspaceSecurity")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
