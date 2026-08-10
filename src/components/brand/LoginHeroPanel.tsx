"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, LineChart, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { AntrahqLogo } from "./AntrahqLogo";

const PILLAR_ICONS = [Building2, LineChart, HeartHandshake] as const;
const PILLAR_KEYS = ["sync", "insights", "delight"] as const;

/** Tablet split — marketing column without carousel height. */
export function LoginHeroTablet() {
  const t = useTranslations("brand");

  return (
    <div className="pravaah-login-hero relative overflow-hidden hidden md:flex lg:hidden md:w-[42%] shrink-0 flex-col justify-center min-h-0 p-8">
      <div className="pravaah-login-bg absolute inset-0" aria-hidden />
      <div className="pravaah-orb pravaah-orb-1 opacity-40" aria-hidden />
      <div className="pravaah-orb pravaah-orb-2 opacity-35" aria-hidden />
      <svg className="pravaah-wave absolute bottom-0 left-0 right-0 text-white/10" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0,64 C240,120 480,0 720,48 C960,96 1200,32 1440,64 L1440,120 L0,120 Z" />
      </svg>

      <div className="relative z-10 space-y-5 max-w-md mp-animate-in">
        <AntrahqLogo size="md" variant="light" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-snug">{t("tagline")}</h1>
          <p className="text-sm text-white/80 leading-relaxed line-clamp-3">{t("mission")}</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4">
          <p className="font-bold text-white text-sm">{t("pillars.sync.title")}</p>
          <p className="text-sm text-white/75 mt-1 leading-relaxed line-clamp-2">{t("pillars.sync.desc")}</p>
        </div>
      </div>
    </div>
  );
}

export function LoginHeroPanel() {
  const t = useTranslations("brand");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % PILLAR_KEYS.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pravaah-login-hero relative overflow-hidden max-w-full hidden lg:flex lg:w-[48%] xl:w-[44%] flex-col justify-center min-h-screen p-10 xl:p-12">
      <div className="pravaah-login-bg absolute inset-0" aria-hidden />
      <div className="pravaah-orb pravaah-orb-1" aria-hidden />
      <div className="pravaah-orb pravaah-orb-2" aria-hidden />
      <div className="pravaah-orb pravaah-orb-3" aria-hidden />
      <svg className="pravaah-wave absolute bottom-0 left-0 right-0 text-white/10" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <path
          fill="currentColor"
          d="M0,64 C240,120 480,0 720,48 C960,96 1200,32 1440,64 L1440,120 L0,120 Z"
          className="pravaah-wave-path"
        />
      </svg>

      <div className="relative z-10 space-y-6 max-w-lg mp-animate-in">
        <AntrahqLogo size="lg" variant="light" />

        <div className="space-y-2">
          <h1 className="text-4xl xl:text-[2.75rem] font-bold tracking-tight text-white leading-tight">{t("tagline")}</h1>
          <p className="text-lg text-white/85 leading-relaxed max-w-md">{t("mission")}</p>
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
                  visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98] pointer-events-none"
                )}
                aria-hidden={!visible}
              >
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">{t(`pillars.${key}.title`)}</p>
                    <p className="text-sm text-white/75 mt-1 leading-relaxed">{t(`pillars.${key}.desc`)}</p>
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
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === active ? "w-8 bg-white" : "w-2 bg-white/35"
              )}
            />
          ))}
        </div>

        <p className="text-xs text-white/60 font-medium">{t("footerTagline")}</p>
      </div>
    </div>
  );
}
