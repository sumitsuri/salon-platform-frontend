"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScratchGiftCardFrame({
  accentColor,
  title,
  children,
  className,
  floating,
}: {
  accentColor?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  floating?: boolean;
}) {
  const accent = accentColor || "#7c3aed";

  return (
    <div
      className={cn(
        "scratch-gift-card relative mx-auto w-full max-w-[min(100%,20rem)]",
        floating && "scratch-gift-float",
        className
      )}
    >
      <div
        className="scratch-gift-card-border rounded-[1.35rem] p-[3px] shadow-xl shadow-violet-500/15"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, #fbbf24 45%, ${accent}cc 100%)`,
        }}
      >
        <div className="relative overflow-hidden rounded-[1.2rem] bg-gradient-to-b from-white via-violet-50/30 to-amber-50/80 dark:from-zinc-900 dark:via-violet-950/40 dark:to-amber-950/20">
          <div
            className="flex items-center justify-center gap-2 border-b border-violet-100/80 px-3 py-2 dark:border-violet-900/40"
            style={{ color: accent }}
          >
            <Gift className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <p className="text-xs font-bold tracking-wide text-center">{title || "Visit surprise"}</p>
          </div>
          <div className="relative flex w-full flex-col items-center justify-center text-center gap-3 p-4 min-h-[12.5rem]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
