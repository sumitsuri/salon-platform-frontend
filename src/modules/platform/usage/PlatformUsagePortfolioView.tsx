"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api, Tenant } from "@/lib/api";
import { getDefaultDateRange, toIsoDateTimeRange, type ProductDateRange } from "@/lib/date-range";
import { MetricChart } from "@/components/LineChart";
import { BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { AlertBanner, Card, PageHeader, inputClass, selectClass } from "@/components/ui";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { UsageStandardTable } from "@/modules/platform/usage/UsageStandardTable";
import { featureLabel } from "@/modules/platform/usage/feature-labels";

function formatInstant(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function PlatformUsagePortfolioView() {
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [tenantFilterId, setTenantFilterId] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");

  const iso = toIsoDateTimeRange(dateRange);

  const { data: tenantsMeta = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.getTenants(),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["platform-usage-portfolio", iso.from, iso.to, includeDemo, tenantFilterId],
    queryFn: () =>
      api.getPlatformUsagePortfolio({
        from: iso.from,
        to: iso.to,
        includeDemo,
        tenantId: tenantFilterId || undefined,
      }),
  });

  const filteredTenants = useMemo(() => {
    const list = data?.tenants ?? [];
    const q = tenantSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.tenantName.toLowerCase().includes(q) || t.tenantSlug.toLowerCase().includes(q),
    );
  }, [data?.tenants, tenantSearch]);

  const stickinessPct = useMemo(() => {
    const s = data?.platformSummary;
    if (!s || s.mau === 0) return null;
    return Math.round((s.wau / s.mau) * 100);
  }, [data?.platformSummary]);

  const platformChart = useMemo(() => {
    if (!data?.dailyActiveUsers?.length) return null;
    const labels = data.dailyActiveUsers.map((d) => d.date.slice(5));
    return (
      <MetricChart
        title="Platform activity (daily)"
        labels={labels}
        series={[
          {
            name: "Active users",
            color: BRANCH_SERIES_COLORS[0],
            values: data.dailyActiveUsers.map((d) => d.activeUsers),
          },
          {
            name: "Events",
            color: BRANCH_SERIES_COLORS[1],
            values: data.dailyActiveUsers.map((d) => d.eventCount),
          },
        ]}
      />
    );
  }, [data?.dailyActiveUsers]);

  const tenantCompareChart = useMemo(() => {
    const rows = [...(data?.tenants ?? [])]
      .filter((t) => t.activeUsersInRange > 0 || t.totalEvents > 0)
      .sort((a, b) => b.activeUsersInRange - a.activeUsersInRange)
      .slice(0, 8);
    if (rows.length === 0) return null;
    return (
      <MetricChart
        title="Active users in range (by brand)"
        labels={rows.map((t) => t.tenantName.slice(0, 14))}
        series={[
          {
            name: "Active users",
            color: BRANCH_SERIES_COLORS[4],
            values: rows.map((t) => t.activeUsersInRange),
          },
        ]}
      />
    );
  }, [data?.tenants]);

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Customer usage"
        subtitle="Feature-level adoption across all brands — filter by date, brand, and drill into branches and users"
      />

      <ScopeFilterBar
        layout="card"
        className="max-w-full w-full"
        showBranch={false}
        dateControl={
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            testId="platform-usage-portfolio-date"
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Brand</span>
          <select
            className={selectClass}
            value={tenantFilterId}
            onChange={(e) => setTenantFilterId(e.target.value)}
          >
            <option value="">All brands</option>
            {tenantsMeta.map((t: Tenant) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Search brands</span>
          <input
            className={inputClass}
            placeholder="Name or slug"
            value={tenantSearch}
            onChange={(e) => setTenantSearch(e.target.value)}
          />
        </label>
      </div>

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
          {error instanceof Error ? error.message : "Failed to load portfolio usage"}
        </AlertBanner>
      )}

      {data && data.telemetryReady === false && (
        <AlertBanner variant="warning">
          Usage metrics are temporarily unavailable (telemetry storage is still initializing). Brand list and
          provisioned users are shown below — try again in a few minutes after API restart.
        </AlertBanner>
      )}

      {isLoading && !data && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading…</Card>
      )}

      {data?.platformSummary && (
        <Card className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-center">
          <Stat label="WAU" value={data.platformSummary.wau} />
          <Stat label="MAU" value={data.platformSummary.mau} />
          <Stat label="Stickiness" value={stickinessPct ?? 0} suffix={stickinessPct != null ? "%" : ""} />
          <Stat label="Active (range)" value={data.platformSummary.activeUsersInRange} />
          <Stat label="Events" value={data.platformSummary.totalEvents} />
          <Stat label="Features" value={data.platformSummary.distinctFeatures} />
          <Stat label="Provisioned" value={data.platformSummary.provisionedUsers} />
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
          <Card className="min-w-0 overflow-x-auto">
            {platformChart ?? (
              <p className="text-sm text-center text-[var(--text-tertiary)] py-12">No platform activity in range.</p>
            )}
          </Card>
          <Card className="min-w-0 overflow-x-auto">
            {tenantCompareChart ?? (
              <p className="text-sm text-center text-[var(--text-tertiary)] py-12">No brand comparison data yet.</p>
            )}
          </Card>
        </div>
      )}

      {data && data.topFeatures.length > 0 && (
        <UsageStandardTable
          title="Top features (platform-wide)"
          rows={data.topFeatures}
          rowKey={(r) => r.featureKey}
          emptyMessage="No features"
          columns={[
            {
              id: "f",
              header: "Feature",
              cell: (r) => (
                <div>
                  <p className="font-medium">{featureLabel(r.featureKey)}</p>
                  <p className="text-xs font-mono text-[var(--text-tertiary)]">{r.featureKey}</p>
                </div>
              ),
            },
            { id: "h", header: "Hits", cell: (r) => r.hitCount },
          ]}
        />
      )}

      <UsageStandardTable
        title="Brands"
        rows={filteredTenants}
        rowKey={(r) => r.tenantId}
        emptyMessage="No brands match filters."
        columns={[
          {
            id: "brand",
            header: "Brand",
            cell: (r) => (
              <Link
                href={`/platform/usage/detail?tenantId=${encodeURIComponent(r.tenantId)}`}
                className="group flex items-center gap-1 font-medium text-teal-800 dark:text-teal-300 hover:underline min-w-0"
              >
                <span className="truncate">{r.tenantName}</span>
                <ChevronRight className="shrink-0 opacity-60 group-hover:opacity-100" size={16} />
              </Link>
            ),
          },
          {
            id: "slug",
            header: "Slug",
            cell: (r) => <span className="text-[var(--text-tertiary)]">{r.tenantSlug}</span>,
          },
          {
            id: "wau",
            header: "WAU",
            cell: (r) => r.wau,
          },
          {
            id: "mau",
            header: "MAU",
            cell: (r) => r.mau,
          },
          {
            id: "active",
            header: "Active (range)",
            cell: (r) => r.activeUsersInRange,
          },
          {
            id: "events",
            header: "Events",
            cell: (r) => r.totalEvents,
          },
          {
            id: "last",
            header: "Last activity",
            cell: (r) => formatInstant(r.lastActivityAt),
          },
        ]}
      />
    </div>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)]/60 px-2 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
      <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
        {value}
        {suffix}
      </p>
    </div>
  );
}
