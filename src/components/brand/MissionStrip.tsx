"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const MESSAGE_KEYS = ["0", "1", "2", "3"] as const;

export function MissionStrip({
  className,
  variant = "subtle",
}: {
  className?: string;
  variant?: "subtle" | "accent";
}) {
  const t = useTranslations("brand.missionStrip");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % MESSAGE_KEYS.length), 8000);
    return () => clearInterval(id);
  }, []);

  const message = t(MESSAGE_KEYS[idx]);

  if (variant === "accent") {
    return (
      <div
        className={cn(
          "rounded-xl border border-[var(--brand-muted)] bg-gradient-to-r from-indigo-50/90 to-violet-50/70 dark:from-indigo-950/40 dark:to-violet-950/30 px-4 py-3 flex items-center gap-3 mp-animate-in",
          className
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-text)]">Pravaah</p>
          <p className="text-sm text-[var(--text-primary)] font-medium leading-snug transition-opacity duration-500" key={idx}>
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--surface-muted)]/70 border border-[var(--border)] text-xs sm:text-sm text-[var(--text-secondary)]",
        className
      )}
    >
      <Sparkles className="w-3.5 h-3.5 text-[var(--brand-text)] shrink-0" />
      <p className="font-medium leading-snug min-w-0 transition-opacity duration-500" key={idx}>
        {message}
      </p>
    </div>
  );
}
