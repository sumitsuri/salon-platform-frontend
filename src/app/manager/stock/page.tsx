"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package, Plus, Receipt, ChevronRight, Boxes } from "lucide-react";
import { PageHeader, Card, btnPrimary } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

function HubAction({
  href,
  icon: Icon,
  label,
  description,
  accent,
}: {
  href: string;
  icon: typeof Package;
  label: string;
  description: string;
  accent: "violet" | "amber";
}) {
  const styles = {
    violet: {
      border: "border-violet-200/80 dark:border-violet-900/40",
      icon: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
    },
    amber: {
      border: "border-amber-200/80 dark:border-amber-900/40",
      icon: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
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

export default function ManagerStockHubPage() {
  const t = useTranslations("manager.stockHub");
  const tHome = useTranslations("manager.home");
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto min-w-0 max-w-lg space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle", { branch: user?.branchName ?? "" })} />

      <div className="space-y-2.5">
        <HubAction
          href="/manager/inventory?add=1"
          icon={Plus}
          label={tHome("actionAddInventory")}
          description={tHome("actionAddInventoryDesc")}
          accent="violet"
        />
        <HubAction
          href="/manager/expenditure?add=1"
          icon={Receipt}
          label={tHome("actionExpenditure")}
          description={tHome("actionExpenditureDesc")}
          accent="amber"
        />
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="dashboard-widget-title">{t("manageSection")}</p>
          <p className="text-xs text-[var(--text-secondary)]">{t("manageHint")}</p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          <Link
            href="/manager/inventory"
            className="flex items-center justify-between gap-3 px-4 py-3.5 touch-manipulation hover:bg-[var(--surface-muted)]/50"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-[var(--text-primary)]">
              <Package className="h-4 w-4 text-violet-600" aria-hidden />
              {t("viewInventory")}
            </span>
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          </Link>
          <Link
            href="/manager/expenditure"
            className="flex items-center justify-between gap-3 px-4 py-3.5 touch-manipulation hover:bg-[var(--surface-muted)]/50"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-[var(--text-primary)]">
              <Boxes className="h-4 w-4 text-amber-600" aria-hidden />
              {t("viewExpenditure")}
            </span>
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          </Link>
        </div>
      </Card>

      <Link href="/manager/inventory?add=1" className={`${btnPrimary} w-full min-h-11 md:hidden`}>
        <Plus className="h-4 w-4" />
        {t("quickAddStock")}
      </Link>
    </div>
  );
}
