"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Scissors, ChevronRight } from "lucide-react";
import { ServiceContributionResponse } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PanelShell, PanelLink } from "@/components/enterprise-ui";

const PREVIEW_ROWS = 6;

const SERVICE_GRID =
  "grid grid-cols-[minmax(0,1fr)_2.25rem_minmax(2.75rem,1fr)_minmax(2.75rem,1fr)] items-center gap-x-2 sm:gap-x-3";

interface ServiceSalesTeaserProps {
  data?: ServiceContributionResponse;
  loading?: boolean;
  href: string;
  panelVariant?: "default" | "dashboard";
  rowLimit?: number | null;
}

export function ServiceSalesTeaser({ data, loading, href, panelVariant = "default", rowLimit }: ServiceSalesTeaserProps) {
  const t = useTranslations("components.serviceSalesTeaser");
  const tCommon = useTranslations("common");
  const services = [...(data?.services ?? [])].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const limit = rowLimit === null ? services.length : (rowLimit ?? PREVIEW_ROWS);
  const preview = services.slice(0, limit);
  const hasMore = rowLimit === null ? false : services.length > limit;

  return (
    <PanelShell
      title={t("title")}
      subtitle={
        loading
          ? tCommon("loading")
          : data
            ? t("summary", { services: data.services.length, sold: data.totalServiceCount })
            : t("noData")
      }
      icon={Scissors}
      accent="brand"
      variant={panelVariant}
      padding={false}
      action={
        <PanelLink href={href} variant={panelVariant}>
          {tCommon("viewAll")}
          <ChevronRight className="w-3.5 h-3.5" />
        </PanelLink>
      }
    >
      {loading ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("analyzing")}</p>
      ) : preview.length === 0 ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      ) : (
        <div className="dashboard-table-scroll-x">
          <div className="dashboard-table-min-w dashboard-table-min-w--wide">
          <div
            className={cn(
              "ui-table-head border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2 grid sm:px-4",
              SERVICE_GRID,
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
              {t("service")}
            </span>
            <span className="text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
              {t("count")}
            </span>
            <span className="text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
              {t("total")}
            </span>
            <span className="text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
              {t("finalTotal")}
            </span>
          </div>
          <div
            className="service-sales-scroll divide-y divide-[var(--border)]"
            role="region"
            aria-label={t("title")}
            tabIndex={hasMore ? 0 : undefined}
          >
            {preview.map((s) => {
              const listAmount = s.listRevenue ?? s.revenue;
              const finalAmount = s.revenue;
              return (
                <Link
                  key={s.serviceName}
                  href={href}
                  className={cn("grid px-3 py-2.5 transition-colors hover:bg-[var(--surface-muted)]/60 sm:px-4", SERVICE_GRID)}
                >
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]" title={s.serviceName}>
                    {s.serviceName}
                  </p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">{s.count}</p>
                  <p className="text-right text-[11px] sm:text-sm tabular-nums text-[var(--text-secondary)]">
                    {formatCurrency(listAmount)}
                  </p>
                  <p className="text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(finalAmount)}
                  </p>
                </Link>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
