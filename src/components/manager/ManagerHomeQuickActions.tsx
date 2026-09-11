"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CreditCard, Gift, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function ActionTile({
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
  accent: "brand" | "sky";
}) {
  const accents = {
    brand: {
      ring: "ring-[var(--brand)]/15",
      icon: "bg-[var(--brand-light)] text-[var(--brand-text)]",
    },
    sky: {
      ring: "ring-sky-500/15",
      icon: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    },
  };
  const a = accents[accent];

  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[4.25rem] min-w-0 flex-col justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-sm ring-1 transition active:scale-[0.98] touch-manipulation hover:border-[var(--brand)]/30 hover:bg-[var(--surface-muted)]/40",
        a.ring,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", a.icon)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="truncate text-sm font-bold text-[var(--text-primary)]">{label}</span>
      </div>
      <p className="line-clamp-2 pl-10 text-[11px] leading-snug text-[var(--text-secondary)]">{description}</p>
    </Link>
  );
}

export function ManagerHomeQuickActions() {
  const t = useTranslations("manager.home");

  return (
    <section aria-labelledby="manager-quick-actions" className="min-w-0">
      <h2
        id="manager-quick-actions"
        className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]"
      >
        {t("quickActions")}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ActionTile
          href="/manager/memberships?sell=1"
          icon={CreditCard}
          label={t("actionSellMembership")}
          description={t("actionSellMembershipDesc")}
          accent="brand"
        />
        <ActionTile
          href="/manager/walk-in?new=1&packages=1"
          icon={Gift}
          label={t("actionSellPackage")}
          description={t("actionSellPackageDesc")}
          accent="sky"
        />
      </div>
    </section>
  );
}
