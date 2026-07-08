"use client";

import Link from "next/link";
import { Scissors, ChevronRight, TrendingUp } from "lucide-react";
import { ServiceContributionResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui";

interface ServiceContributionTeaserProps {
  data?: ServiceContributionResponse;
  loading?: boolean;
  href: string;
}

export function ServiceContributionTeaser({ data, loading, href }: ServiceContributionTeaserProps) {
  const top = data?.services.slice(0, 3) ?? [];
  const laggard = data?.services.length ? data.services[data.services.length - 1] : undefined;

  return (
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-[var(--brand-text)]" />
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">Service sales</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {loading
                ? "Loading..."
                : data
                  ? `${data.services.length} services · ${data.totalServiceCount} sold`
                  : "No data yet"}
            </p>
          </div>
        </div>
        <Link href={href} className="link-brand text-xs flex items-center gap-0.5">
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">Analyzing service performance...</p>
      ) : top.length === 0 ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">
          Service contribution appears after completed visits in this period.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {top.map((s, i) => (
            <Link
              key={s.serviceName}
              href={href}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-muted)] transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                {i === 0 && <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--text-primary)] truncate">{s.serviceName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {s.count} sold · {s.revenueSharePct}% of revenue
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold shrink-0">{formatCurrency(s.revenue)}</span>
            </Link>
          ))}
          {laggard && top.length >= 3 && laggard.serviceName !== top[0]?.serviceName && (
            <Link
              href={href}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-muted)] transition bg-amber-50/50 dark:bg-amber-950/20"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Needs focus
                </p>
                <p className="font-medium text-sm text-[var(--text-primary)] truncate">{laggard.serviceName}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {laggard.count} sold · {laggard.revenueSharePct}% share
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
