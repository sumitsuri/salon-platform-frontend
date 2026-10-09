"use client";

import { cn } from "@/lib/utils";

export type EmployeeShowcaseSlide = "punch" | "sales" | "reviews";

type Props = {
  slide: EmployeeShowcaseSlide;
  className?: string;
  compact?: boolean;
};

/** Stylised phone previews of the employee app (SVG, no external assets). */
export function EmployeeLoginShowcase({ slide, className, compact }: Props) {
  const w = compact ? 140 : 220;
  const h = compact ? 280 : 440;

  return (
    <div
      className={cn("employee-login-showcase-glow mx-auto transition-opacity duration-700", className)}
      aria-hidden
    >
      <svg width={w} height={h} viewBox="0 0 220 440" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="4" width="204" height="432" rx="32" fill="#0f172a" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
        <rect x="68" y="14" width="84" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
        <rect x="16" y="36" width="188" height="388" rx="20" fill="#f8fafc" />

        {slide === "punch" && (
          <>
            <rect x="28" y="52" width="80" height="10" rx="4" fill="#cbd5e1" />
            <rect x="28" y="72" width="120" height="8" rx="3" fill="#e2e8f0" />
            <rect x="28" y="100" width="164" height="72" rx="14" fill="#ccfbf1" stroke="#14b8a6" strokeWidth="2" />
            <circle cx="110" cy="136" r="22" fill="#0d9488" />
            <path d="M102 136 L108 142 L120 128" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <text x="110" y="178" textAnchor="middle" fill="#0f766e" fontSize="11" fontWeight="700">
              Punch in
            </text>
            <rect x="28" y="200" width="164" height="48" rx="10" fill="#fff" stroke="#e2e8f0" />
            <rect x="40" y="214" width="60" height="6" rx="2" fill="#94a3b8" />
            <rect x="28" y="260" width="164" height="48" rx="10" fill="#fff" stroke="#e2e8f0" />
          </>
        )}

        {slide === "sales" && (
          <>
            <rect x="28" y="52" width="100" height="10" rx="4" fill="#cbd5e1" />
            <rect x="28" y="72" width="140" height="8" rx="3" fill="#e2e8f0" />
            <circle cx="110" cy="150" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle cx="110" cy="150" r="52" fill="none" stroke="#0d9488" strokeWidth="10" strokeDasharray="220 120" strokeLinecap="round" transform="rotate(-90 110 150)" />
            <text x="110" y="148" textAnchor="middle" fill="#0f766e" fontSize="18" fontWeight="800">
              72%
            </text>
            <text x="110" y="168" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">
              of target
            </text>
            <rect x="28" y="220" width="76" height="56" rx="10" fill="#ecfdf5" />
            <rect x="116" y="220" width="76" height="56" rx="10" fill="#ecfeff" />
            <rect x="40" y="236" width="48" height="6" rx="2" fill="#14b8a6" />
            <rect x="128" y="236" width="48" height="6" rx="2" fill="#06b6d4" />
          </>
        )}

        {slide === "reviews" && (
          <>
            <rect x="28" y="52" width="90" height="10" rx="4" fill="#cbd5e1" />
            <rect x="28" y="72" width="130" height="8" rx="3" fill="#e2e8f0" />
            <rect x="28" y="100" width="164" height="88" rx="14" fill="#fff" stroke="#e2e8f0" strokeWidth="1.5" />
            <rect x="40" y="116" width="100" height="8" rx="3" fill="#0d9488" opacity="0.35" />
            <rect x="40" y="132" width="140" height="6" rx="2" fill="#cbd5e1" />
            <rect x="40" y="146" width="120" height="6" rx="2" fill="#e2e8f0" />
            <rect x="40" y="168" width="48" height="8" rx="4" fill="#fef3c7" />
            <rect x="28" y="200" width="164" height="72" rx="14" fill="#fff" stroke="#e2e8f0" strokeWidth="1.5" />
            <rect x="40" y="216" width="80" height="8" rx="3" fill="#94a3b8" />
            <rect x="40" y="234" width="130" height="6" rx="2" fill="#e2e8f0" />
          </>
        )}
      </svg>
    </div>
  );
}
