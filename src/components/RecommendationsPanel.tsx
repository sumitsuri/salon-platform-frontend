"use client";

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
import { Card } from "@/components/ui";

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
  INFO: "severity-info",
};

const SEVERITY_BADGE: Record<string, string> = {
  HIGH: "badge-high",
  MEDIUM: "badge-medium",
  LOW: "badge-low",
  INFO: "badge-info",
};

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
  return (
    <div className={cn("rounded-xl border p-4 flex gap-3", SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.INFO)}>
      <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center shrink-0 border border-[var(--border)]">
        <Icon className="w-4 h-4 text-[var(--text-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-[var(--text-primary)]">{item.title}</p>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold shrink-0",
              SEVERITY_BADGE[item.severity] ?? SEVERITY_BADGE.INFO
            )}
          >
            {item.severity}
          </span>
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
  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">Loading recommendations...</p>
      </Card>
    );
  }

  const brandWide = data?.brandWide ?? [];
  const branches = data?.branches ?? [];
  const hasContent = brandWide.length > 0 || branches.length > 0;

  if (!hasContent) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-5 h-5 text-[var(--brand-text)]" />
          <h2 className="font-semibold text-[var(--text-primary)] text-sm">Recommendations</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          No actionable insights for this period yet. Check back after more visits are recorded.
        </p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm">Recommendations</h2>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {variant === "manager"
              ? "Sales, staff & service insights for your branch"
              : "Brand-wide and per-branch insights"}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {brandWide.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Brand-wide</h3>
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
    </Card>
  );
}
