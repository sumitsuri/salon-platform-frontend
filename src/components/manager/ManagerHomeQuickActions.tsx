"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CreditCard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PackageUpsellCta } from "@/app/manager/packages/PackageUpsellCta";

function ActionTile({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[4.25rem] min-w-0 flex-col justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-sm ring-1 ring-[var(--brand)]/15 transition active:scale-[0.98] touch-manipulation hover:border-[var(--brand)]/30 hover:bg-[var(--surface-muted)]/40",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-text)]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="truncate ui-card-title">{label}</span>
      </div>
      <p className="line-clamp-2 pl-10 text-[11px] leading-snug text-[var(--text-secondary)]">{description}</p>
    </Link>
  );
}

export function ManagerHomeQuickActions() {
  const t = useTranslations("manager.home");
  const tPkg = useTranslations("manager.packages");

  return (
    <section aria-labelledby="manager-quick-actions" className="min-w-0">
      <h2 id="manager-quick-actions" className="section-label mb-2">
        {t("quickActions")}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ActionTile
          href="/manager/memberships?sell=1"
          icon={CreditCard}
          label={t("actionSellMembership")}
          description={t("actionSellMembershipDesc")}
        />
        <div className="min-w-0 sm:col-span-2">
          <PackageUpsellCta
            href="/manager/packages"
            title={tPkg("upsellTitle")}
            subtitle={tPkg("upsellSubtitleHome")}
            className="manager-package-upsell-vibrant"
          />
        </div>
      </div>
    </section>
  );
}
