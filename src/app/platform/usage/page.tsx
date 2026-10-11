"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Card, AlertBanner, EmptyState } from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 27);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function formatInstant(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function PlatformUsagePage() {
  const [range] = useState(defaultRange);
  const [includeDemo, setIncludeDemo] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["platform-usage-summary", range.from, range.to, includeDemo],
    queryFn: () =>
      api.getPlatformUsageSummary({
        from: range.from,
        to: range.to,
        includeDemo,
      }),
  });

  const rows = useMemo(() => {
    const list = data?.tenants ?? [];
    return [...list].sort((a, b) => b.wau - a.wau || a.tenantName.localeCompare(b.tenantName));
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customer usage"
        subtitle="Product adoption across all brands and branches — last 28 days"
      />
      <MissionStrip />

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={includeDemo}
          onChange={(e) => setIncludeDemo(e.target.checked)}
          className="rounded border-[var(--border-subtle)]"
        />
        Include demo / sandbox brands
      </label>

      {isError && (
        <AlertBanner variant="error">
          {error instanceof Error ? error.message : "Failed to load usage"}
        </AlertBanner>
      )}

      {isLoading && !data && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading usage…</Card>
      )}

      {data && rows.length === 0 && (
        <EmptyState
          icon={Activity}
          title="No usage yet"
          description="Events appear after teams use employee, manager, and admin apps."
        />
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => (
            <Link
              key={row.tenantId}
              href={`/platform/usage/detail?tenantId=${encodeURIComponent(row.tenantId)}`}
            >
              <Card className="p-4 flex items-center gap-4 hover:border-[var(--accent)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate">
                    {row.tenantName}
                    {row.demoTenant ? (
                      <span className="ml-2 text-xs font-medium text-[var(--text-tertiary)]">Demo</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{row.tenantSlug}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    WAU {row.wau} · MAU {row.mau} · {row.provisionedUsers} provisioned users
                  </p>
                  {row.topFeatures.length > 0 && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                      Top: {row.topFeatures.map((f) => f.featureKey).join(", ")}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    Last activity {formatInstant(row.lastActivityAt)}
                  </p>
                </div>
                <ChevronRight className="shrink-0 text-[var(--text-tertiary)]" size={20} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
