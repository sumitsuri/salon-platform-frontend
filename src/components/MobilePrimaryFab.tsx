"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppNavItem } from "@/components/app-nav";

interface MobilePrimaryFabProps {
  items: AppNavItem[];
  color?: string;
  hidden?: boolean;
}

/** Single primary action on phone — not a second nav bar (Material / iOS pattern). */
export function MobilePrimaryFab({ items, color = "var(--brand)", hidden }: MobilePrimaryFabProps) {
  const pathname = usePathname();
  const fab = items.find((item) => item.fab);
  if (!fab || hidden) return null;
  if (pathname === fab.href || pathname.startsWith(`${fab.href}/`)) return null;

  const Icon = fab.icon;

  return (
    <Link
      href={fab.href}
      aria-label={fab.label}
      data-testid="mobile-primary-fab"
      className={cn(
        "md:hidden fixed z-40 flex items-center gap-2 rounded-2xl px-4 py-3.5 text-white font-semibold text-sm shadow-lg touch-manipulation transition-transform active:scale-[0.97]",
        "right-4 max-[380px]:right-3"
      )}
      style={{
        backgroundColor: color,
        boxShadow: `0 8px 24px ${color}55`,
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{fab.label}</span>
    </Link>
  );
}
