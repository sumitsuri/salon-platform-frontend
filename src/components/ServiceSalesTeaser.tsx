"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Scissors, ChevronRight } from "lucide-react";
import { ServiceContributionResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PanelShell, PanelLink } from "@/components/enterprise-ui";

const PREVIEW_ROWS = 6;

interface ServiceSalesTeaserProps {
  data?: ServiceContributionResponse;
  loading?: boolean;
  href: string;
}

export function ServiceSalesTeaser({ data, loading, href }: ServiceSalesTeaserProps) {
  const t = useTranslations("components.serviceSalesTeaser");
  const tCommon = useTranslations("common");
  const services = [...(data?.services ?? [])].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const preview = services.slice(0, PREVIEW_ROWS);
  const hasMore = services.length > PREVIEW_ROWS;

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
      padding={false}
      action={
        <PanelLink href={href}>
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
        <>
          <div
            className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_4rem_5.5rem] sm:items-center sm:gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]"
            aria-hidden
          >
            <span>{t("service")}</span>
            <span className="text-right">{t("count")}</span>
            <span className="text-right">{t("total")}</span>
          </div>
          <div
            className="service-sales-scroll divide-y divide-[var(--border)]"
            role="region"
            aria-label={t("title")}
            tabIndex={hasMore ? 0 : undefined}
          >
            {preview.map((s) => (
              <Link
                key={s.serviceName}
                href={href}
                className="block px-3 py-3 transition-colors hover:bg-[var(--surface-muted)]/60 sm:px-4 sm:py-2.5"
              >
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {s.serviceName}
                    </p>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(s.revenue)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums text-[var(--text-secondary)] sm:text-xs">
                    {t("count")}: {s.count}
                  </p>
                </div>
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_4rem_5.5rem] sm:items-center sm:gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">{s.serviceName}</p>
                  <p className="text-right text-sm tabular-nums text-[var(--text-primary)]">{s.count}</p>
                  <p className="text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(s.revenue)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </PanelShell>
  );
}
