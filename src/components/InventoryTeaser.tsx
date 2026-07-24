"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Package } from "lucide-react";
import { InventoryOverview } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PanelShell, PanelLink } from "@/components/enterprise-ui";

interface InventoryTeaserProps {
  data?: InventoryOverview;
  loading?: boolean;
  href: string;
}

export function InventoryTeaser({ data, loading, href }: InventoryTeaserProps) {
  const t = useTranslations("components.inventoryTeaser");
  const tCommon = useTranslations("common");
  const alertCount = (data?.lowStockCount ?? 0) + (data?.outOfStockCount ?? 0);

  return (
    <PanelShell
      title={t("title")}
      subtitle={loading ? tCommon("loading") : data?.periodLabel ?? t("subtitleDefault")}
      icon={Package}
      accent="amber"
      action={
        <PanelLink href={href}>
          {t("manage")}
          <ChevronRight className="w-3.5 h-3.5" />
        </PanelLink>
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
      ) : !data ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: t("productCost"), value: formatCurrency(data.totalProductCost), warn: false },
            { label: t("stockValue"), value: formatCurrency(data.totalStockValue), warn: false },
            { label: t("alerts"), value: t("itemsCount", { count: alertCount }), warn: alertCount > 0 },
          ].map((cell) => (
            <div
              key={cell.label}
              className={
                cell.warn
                  ? "rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-center"
                  : "rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 text-center"
              }
            >
              <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--text-tertiary)]">{cell.label}</p>
              <p className={`text-sm font-bold tabular-nums mt-1 ${cell.warn ? "text-amber-700 dark:text-amber-400" : ""}`}>
                {cell.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
