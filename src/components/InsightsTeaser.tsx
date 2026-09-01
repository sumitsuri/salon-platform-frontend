"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lightbulb, ChevronRight } from "lucide-react";
import { RecommendationsResponse } from "@/lib/api";
import { StatusBadge } from "@/components/ui";
import { PanelShell, PanelLink } from "@/components/enterprise-ui";
import { countInsights, flattenInsights } from "@/lib/insights-utils";

interface InsightsTeaserProps {
  data?: RecommendationsResponse;
  loading?: boolean;
  href: string;
  previewCount?: number;
  panelVariant?: "default" | "dashboard";
}

export function InsightsTeaser({ data, loading, href, previewCount = 3, panelVariant = "default" }: InsightsTeaserProps) {
  const t = useTranslations("components.insightsTeaser");
  const tCommon = useTranslations("common");
  const total = countInsights(data);
  const top = flattenInsights(data).slice(0, previewCount);

  return (
    <PanelShell
      title={t("title")}
      subtitle={loading ? tCommon("loading") : total > 0 ? t("tipsCount", { count: total }) : t("noTips")}
      icon={Lightbulb}
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
      ) : top.length === 0 ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {top.map((item) => (
            <Link
              key={item.id}
              href={href}
              className="flex items-start justify-between gap-2 min-w-0 px-3 sm:px-4 py-3.5 hover:bg-[var(--surface-muted)]/60 transition"
            >
              <div className="min-w-0 flex-1 flex gap-2 sm:gap-3">
                <span
                  className={
                    item.severity === "HIGH"
                      ? "w-1 rounded-full bg-amber-500 shrink-0 self-stretch"
                      : item.severity === "MEDIUM"
                        ? "w-1 rounded-full bg-violet-500 shrink-0 self-stretch"
                        : "w-1 rounded-full bg-sky-400 shrink-0 self-stretch"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--text-primary)] leading-snug">{item.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">{item.message}</p>
                  {item.metricLabel && item.metricValue ? (
                    <p className="text-xs font-semibold text-[var(--brand-text)] mt-1.5 tabular-nums">
                      {item.metricLabel}: {item.metricValue}
                    </p>
                  ) : null}
                </div>
              </div>
              <StatusBadge status={item.severity} className="shrink-0 max-w-[4.75rem] truncate" />
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
