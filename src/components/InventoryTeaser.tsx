"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Package } from "lucide-react";
import { InventoryOverview } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui";

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
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--brand-text)]" />
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">{t("title")}</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {loading ? tCommon("loading") : data?.periodLabel ?? t("subtitleDefault")}
            </p>
          </div>
        </div>
        <Link href={href} className="link-brand text-xs flex items-center gap-0.5">
          {t("manage")}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loading")}</p>
      ) : !data ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      ) : (
        <div className="p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{t("productCost")}</p>
            <p className="text-sm font-bold">{formatCurrency(data.totalProductCost)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{t("stockValue")}</p>
            <p className="text-sm font-bold">{formatCurrency(data.totalStockValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{t("alerts")}</p>
            <p className="text-sm font-bold text-amber-600">{t("itemsCount", { count: alertCount })}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
