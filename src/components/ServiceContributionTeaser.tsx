"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Scissors, ChevronRight, TrendingUp } from "lucide-react";
import { ServiceContributionResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PanelShell, PanelLink } from "@/components/enterprise-ui";

interface ServiceContributionTeaserProps {
  data?: ServiceContributionResponse;
  loading?: boolean;
  href: string;
}

export function ServiceContributionTeaser({ data, loading, href }: ServiceContributionTeaserProps) {
  const t = useTranslations("components.serviceContributionTeaser");
  const tCommon = useTranslations("common");
  const top = data?.services.slice(0, 3) ?? [];
  const laggard = data?.services.length ? data.services[data.services.length - 1] : undefined;

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
      accent="violet"
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
      ) : top.length === 0 ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {top.map((s, i) => (
            <Link
              key={s.serviceName}
              href={href}
              className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--surface-muted)]/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={
                    i === 0
                      ? "w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0"
                      : "w-8 h-8 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-xs font-bold text-[var(--text-tertiary)]"
                  }
                >
                  {i === 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{s.serviceName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("soldRevenue", { count: s.count, pct: s.revenueSharePct })}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold shrink-0 tabular-nums text-violet-700 dark:text-violet-400">
                {formatCurrency(s.revenue)}
              </span>
            </Link>
          ))}
          {laggard && top.length >= 3 && laggard.serviceName !== top[0]?.serviceName && (
            <Link
              href={href}
              className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 transition bg-amber-50/40 dark:bg-amber-950/15 border-l-4 border-l-amber-500"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  {t("needsFocus")}
                </p>
                <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{laggard.serviceName}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("share", { count: laggard.count, pct: laggard.revenueSharePct })}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
            </Link>
          )}
        </div>
      )}
    </PanelShell>
  );
}
