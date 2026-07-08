"use client";

import Link from "next/link";
import { Lightbulb, ChevronRight } from "lucide-react";
import { RecommendationsResponse } from "@/lib/api";
import { Card, StatusBadge } from "@/components/ui";
import { countInsights, flattenInsights } from "@/lib/insights-utils";

interface InsightsTeaserProps {
  data?: RecommendationsResponse;
  loading?: boolean;
  href: string;
}

export function InsightsTeaser({ data, loading, href }: InsightsTeaserProps) {
  const total = countInsights(data);
  const top = flattenInsights(data).slice(0, 2);

  return (
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[var(--brand-text)]" />
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">Insights</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {loading ? "Loading..." : total > 0 ? `${total} actionable tip${total > 1 ? "s" : ""}` : "No tips yet"}
            </p>
          </div>
        </div>
        <Link href={href} className="link-brand text-xs flex items-center gap-0.5">
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">Analyzing your branch data...</p>
      ) : top.length === 0 ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">
          Insights appear after more visits and activity are recorded.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {top.map((item) => (
            <Link
              key={item.id}
              href={href}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-muted)] transition"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-[var(--text-primary)] truncate">{item.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{item.message}</p>
              </div>
              <StatusBadge status={item.severity} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
