"use client";

import { cn } from "@/lib/utils";

export function PravaahLogo({
  size = "md",
  variant = "light",
  className,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
}) {
  const dims = size === "sm" ? 36 : size === "lg" ? 56 : 44;
  const textClass =
    size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
  const fg = variant === "light" ? "text-white" : "text-[var(--text-primary)]";
  const accent = variant === "light" ? "text-white/90" : "text-[var(--brand-text)]";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center shadow-lg shrink-0 pravaah-logo-glow",
          variant === "light" ? "bg-white/15 backdrop-blur-sm border border-white/25" : "bg-[var(--brand-light)] border border-[var(--brand-muted)]"
        )}
        style={{ width: dims, height: dims }}
      >
        <svg viewBox="0 0 32 32" className="w-[55%] h-[55%]" aria-hidden>
          <path
            d="M4 22 C8 14, 12 10, 16 12 C20 14, 24 8, 28 14"
            fill="none"
            stroke={variant === "light" ? "#ffffff" : "var(--brand)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            className="pravaah-flow-stroke"
          />
          <circle
            cx="16"
            cy="12"
            r="3"
            fill={variant === "light" ? "#e0e7ff" : "var(--brand)"}
            className="pravaah-flow-dot"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className={cn("font-bold tracking-tight leading-none", textClass, fg)}>Pravaah</p>
        <p className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mt-1", accent)}>
          Salon OS
        </p>
      </div>
    </div>
  );
}
