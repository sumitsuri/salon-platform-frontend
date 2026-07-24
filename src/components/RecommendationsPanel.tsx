"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownRight,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { BranchRecommendations, Recommendation, RecommendationsResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { PanelShell, PageLoader } from "@/components/enterprise-ui";

const CATEGORY_ICONS: Record<string, typeof TrendingUp> = {
  SALES: TrendingUp,
  STAFF: Users,
  SERVICES: Sparkles,
  DISCOUNTS: ArrowDownRight,
  PAYMENTS: Lightbulb,
  OPERATIONS: AlertTriangle,
};

function RecommendationCard({ item }: { item: Recommendation }) {
  const Icon = CATEGORY_ICONS[item.category] ?? Lightbulb;
  const borderClass =
    item.severity === "HIGH"
      ? "border-l-4 border-l-amber-500 severity-high"
      : item.severity === "MEDIUM"
        ? "border-l-4 border-l-violet-500 severity-medium"
        : "border-l-4 border-l-sky-400 severity-info";
  return (
    <div className={cn("rounded-xl border p-4 flex gap-3 shadow-sm hover:shadow-md transition mp-animate-in", borderClass)}>
      <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center shrink-0 border border-[var(--border)]">
        <Icon className="w-4 h-4 text-[var(--text-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-[var(--text-primary)]">{item.title}</p>
          <StatusBadge status={item.severity} className="shrink-0" />
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{item.message}</p>
        {item.metricLabel && item.metricValue && (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            <span className="font-medium">{item.metricLabel}:</span> {item.metricValue}
          </p>
        )}
      </div>
    </div>
  );
}

function BranchSection({ branch }: { branch: BranchRecommendations }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{branch.branchName}</h3>
      <div className="grid gap-3">
        {branch.items.map((item) => (
          <RecommendationCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

interface RecommendationsPanelProps {
  data?: RecommendationsResponse;
  loading?: boolean;
  variant?: "ceo" | "manager";
}

export function RecommendationsPanel({
  data,
  loading,
  variant = "ceo",
}: RecommendationsPanelProps) {
  const t = useTranslations("components.recommendationsPanel");

  if (loading) {
    return (
      <PanelShell title={t("title")} icon={Lightbulb} accent="brand">
        <PageLoader label={t("loading")} />
      </PanelShell>
    );
  }

  const brandWide = data?.brandWide ?? [];
  const branches = data?.branches ?? [];
  const hasContent = brandWide.length > 0 || branches.length > 0;

  if (!hasContent) {
    return (
      <PanelShell title={t("title")} icon={Lightbulb} accent="brand">
        <p className="text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title={t("title")}
      subtitle={variant === "manager" ? t("managerSubtitle") : t("ceoSubtitle")}
      icon={Lightbulb}
      accent="brand"
      padding={false}
    >
      <div className="p-4 space-y-5">
        {brandWide.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("brandWide")}</h3>
            <div className="grid gap-3">
              {brandWide.map((item) => (
                <RecommendationCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {variant === "manager" && branches.length === 1 ? (
          <div className="grid gap-3">
            {branches[0].items.map((item) => (
              <RecommendationCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          branches.map((branch) => <BranchSection key={branch.branchId} branch={branch} />)
        )}
      </div>
    </PanelShell>
  );
}
