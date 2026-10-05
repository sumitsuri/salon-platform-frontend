"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminHubActionLink({
  href,
  icon: Icon,
  label,
  description,
  accent,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  accent: "violet" | "sky" | "emerald" | "amber" | "rose" | "brand";
}) {
  const styles = {
    violet: {
      border: "border-violet-200/80 dark:border-violet-900/40",
      icon: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
    },
    sky: {
      border: "border-sky-200/80 dark:border-sky-900/40",
      icon: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    },
    emerald: {
      border: "border-emerald-200/80 dark:border-emerald-900/40",
      icon: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    },
    amber: {
      border: "border-amber-200/80 dark:border-amber-900/40",
      icon: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    },
    rose: {
      border: "border-rose-200/80 dark:border-rose-900/40",
      icon: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
    },
    brand: {
      border: "border-[var(--brand-muted)]",
      icon: "bg-[var(--brand-light)] text-[var(--brand-text)]",
    },
  };
  const s = styles[accent];

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-[var(--surface)] p-4 min-h-[5rem] shadow-sm touch-manipulation transition active:scale-[0.99] hover:bg-[var(--surface-muted)]/40",
        s.border,
      )}
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", s.icon)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] ui-card-title">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-snug">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
    </Link>
  );
}
