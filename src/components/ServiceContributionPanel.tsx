"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp, Scissors } from "lucide-react";
import { ServiceContributionResponse } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, EmptyState, FilterableTable, TablePagination, DEFAULT_PAGE_SIZE } from "@/components/ui";

interface ServiceContributionPanelProps {
  data?: ServiceContributionResponse;
  loading?: boolean;
  serviceFilter?: string;
  onServiceFilterChange?: (value: string) => void;
  page?: number;
  size?: number;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
}

function heroIndices(services: ServiceContributionResponse["services"]) {
  if (services.length === 0) return new Set<number>();
  const heroes = new Set<number>();
  for (let i = 0; i < Math.min(3, services.length); i++) heroes.add(i);
  return heroes;
}

function laggardIndices(services: ServiceContributionResponse["services"]) {
  if (services.length < 4) return new Set<number>();
  const laggards = new Set<number>();
  const start = Math.max(0, services.length - 3);
  for (let i = start; i < services.length; i++) {
    if (services[i].count > 0) laggards.add(i);
  }
  return laggards;
}

export function ServiceContributionPanel({
  data,
  loading,
  serviceFilter = "",
  onServiceFilterChange,
  page = 0,
  size = DEFAULT_PAGE_SIZE,
  onPageChange,
  onSizeChange,
}: ServiceContributionPanelProps) {
  const t = useTranslations("components.serviceContributionPanel");
  const [localFilter, setLocalFilter] = useState(serviceFilter);

  useEffect(() => {
    const timer = setTimeout(() => onServiceFilterChange?.(localFilter), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilter]);

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
      </Card>
    );
  }

  if (!data || data.totalElements === 0) {
    return (
      <Card>
        <EmptyState title={t("noSalesTitle")} description={t("noSalesDesc")} />
      </Card>
    );
  }

  const heroes = heroIndices(data.services);
  const laggards = laggardIndices(data.services);
  const totalPages = data.totalPages ?? 0;
  const totalElements = data.totalElements ?? data.services.length;

  const columns = [
    {
      label: t("columns.service"),
      filter: {
        type: "text" as const,
        placeholder: t("serviceFilter"),
        value: localFilter,
        onChange: setLocalFilter,
      },
    },
    { label: t("columns.count"), filter: { type: "none" as const } },
    { label: t("columns.revenue"), filter: { type: "none" as const } },
    { label: t("columns.revPct"), filter: { type: "none" as const } },
    { label: t("columns.share"), filter: { type: "none" as const } },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="!p-3.5">
          <p className="text-xs text-[var(--text-secondary)]">{t("totalSales")}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{formatCurrency(data.totalRevenue)}</p>
        </Card>
        <Card className="!p-3.5">
          <p className="text-xs text-[var(--text-secondary)]">{t("serviceRevenue")}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{formatCurrency(data.serviceRevenue)}</p>
        </Card>
        <Card className="!p-3.5 col-span-2 sm:col-span-1">
          <p className="text-xs text-[var(--text-secondary)]">{t("servicesSold")}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{data.totalServiceCount}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[var(--brand-text)]" />
          <div>
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("title")}</h2>
            <p className="text-xs text-[var(--text-secondary)]">{t("servicesInPeriod", { count: totalElements })}</p>
          </div>
        </div>

        {data.services.length === 0 ? (
          <EmptyState title={t("noMatchTitle")} description={t("noMatchDesc")} />
        ) : (
          <>
            <div className="hidden md:block">
              <FilterableTable columns={columns}>
                {data.services.map((s, i) => (
                  <tr key={s.serviceName} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{s.serviceName}</span>
                        {heroes.has(i) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <TrendingUp className="w-3 h-3" />
                            {t("hero")}
                          </span>
                        )}
                        {laggards.has(i) && !heroes.has(i) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                            <TrendingDown className="w-3 h-3" />
                            {t("focus")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.count}
                      <span className="text-xs text-[var(--text-tertiary)] ml-1">({s.countSharePct}%)</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(s.revenue)}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--brand-text)]">{s.revenueSharePct}%</td>
                    <td className="px-4 py-3">
                      <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--brand)]"
                          style={{ width: `${Math.min(100, s.revenueSharePct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>

            <div className="md:hidden divide-y divide-[var(--border)]">
              {data.services.map((s, i) => (
                <div key={s.serviceName} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-medium text-sm text-[var(--text-primary)]">{s.serviceName}</p>
                        {heroes.has(i) && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            {t("hero")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {t("bookingsVolume", { count: s.count, pct: s.countSharePct })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatCurrency(s.revenue)}</p>
                      <p className={cn("text-xs font-semibold text-[var(--brand-text)]")}>{s.revenueSharePct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {onPageChange && onSizeChange && (
          <TablePagination
            page={page}
            size={size}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={onPageChange}
            onSizeChange={onSizeChange}
          />
        )}
      </Card>
    </div>
  );
}
