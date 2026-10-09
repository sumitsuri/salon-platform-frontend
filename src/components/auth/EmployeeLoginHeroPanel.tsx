"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { AntrahqLogo } from "@/components/brand/AntrahqLogo";
import { EmployeeLoginShowcase, type EmployeeShowcaseSlide } from "./EmployeeLoginShowcase";

const SLIDES: EmployeeShowcaseSlide[] = ["punch", "sales", "reviews"];
const PILLAR_ICONS = [Clock, TrendingUp, Star] as const;
const PILLAR_KEYS = ["punch", "sales", "reviews"] as const;

export function EmployeeLoginHeroTablet() {
  const t = useTranslations("auth.employeeHero");

  return (
    <div className="employee-login-hero relative hidden min-h-[100dvh] w-[42%] max-w-md shrink-0 flex-col justify-center overflow-hidden p-6 md:flex lg:hidden sm:p-8">
      <div className="employee-login-bg absolute inset-0" aria-hidden />
      <div className="employee-login-orb w-48 h-48 -top-10 -right-10 opacity-50" aria-hidden />
      <div className="employee-login-orb w-36 h-36 bottom-20 -left-8 opacity-40" aria-hidden />
      <svg className="pravaah-wave absolute bottom-0 left-0 right-0 text-white/10" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0,64 C240,120 480,0 720,48 C960,96 1200,32 1440,64 L1440,120 L0,120 Z" />
      </svg>

      <div className="relative z-10 space-y-4 max-w-md mp-animate-in">
        <AntrahqLogo size="md" variant="light" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-snug">{t("tagline")}</h1>
          <p className="text-sm text-white/80 leading-relaxed line-clamp-3">{t("mission")}</p>
        </div>
        <EmployeeLoginShowcase slide="punch" compact />
      </div>
    </div>
  );
}

export function EmployeeLoginHeroPanel() {
  const t = useTranslations("auth.employeeHero");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % PILLAR_KEYS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[active];

  return (
    <div className="employee-login-hero relative hidden min-h-[100dvh] max-w-full flex-col justify-center overflow-hidden p-8 lg:flex lg:w-[48%] xl:w-[44%] xl:p-12">
      <div className="employee-login-bg absolute inset-0" aria-hidden />
      <div className="employee-login-orb w-64 h-64 -top-16 -right-12 opacity-45" aria-hidden />
      <div className="employee-login-orb w-48 h-48 top-1/3 -left-16 opacity-35" aria-hidden />
      <div className="employee-login-orb w-40 h-40 bottom-8 right-1/4 opacity-30" aria-hidden />
      <svg className="pravaah-wave absolute bottom-0 left-0 right-0 text-white/10" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0,64 C240,120 480,0 720,48 C960,96 1200,32 1440,64 L1440,120 L0,120 Z" className="pravaah-wave-path" />
      </svg>

      <div className="relative z-10 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center mp-animate-in max-w-2xl">
        <div className="space-y-5">
          <AntrahqLogo size="lg" variant="light" />
          <div className="space-y-2">
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">{t("tagline")}</h1>
            <p className="text-base xl:text-lg text-white/85 leading-relaxed max-w-md">{t("mission")}</p>
          </div>

          <div className="relative min-h-[6.5rem]">
            {PILLAR_KEYS.map((key, i) => {
              const Icon = PILLAR_ICONS[i];
              const visible = i === active;
              return (
                <div
                  key={key}
                  className={cn(
                    "absolute inset-0 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 transition-all duration-700",
                    visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98] pointer-events-none",
                  )}
                  aria-hidden={!visible}
                >
                  <div className="flex gap-3 items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{t(`pillars.${key}.title`)}</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/75">{t(`pillars.${key}.desc`)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1" aria-hidden>
            {PILLAR_KEYS.map((key, i) => (
              <div
                key={key}
                className={cn("h-1 rounded-full transition-all duration-500", i === active ? "w-8 bg-white" : "w-2 bg-white/35")}
              />
            ))}
          </div>

          <p className="text-xs font-medium text-white/60">{t("footer")}</p>
        </div>

        <EmployeeLoginShowcase slide={slide} className="hidden xl:block shrink-0" />
      </div>
    </div>
  );
}
