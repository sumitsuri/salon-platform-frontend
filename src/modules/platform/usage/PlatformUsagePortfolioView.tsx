"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Tenant } from "@/lib/api";
import { getDefaultDateRange, toIsoDateTimeRange, type ProductDateRange } from "@/lib/date-range";
import { MetricChart } from "@/components/LineChart";
import { BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { AlertBanner, Card, PageHeader, inputClass, selectClass } from "@/components/ui";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { PortfolioInsights } from "@/modules/platform/usage/insights/PortfolioInsights";
import { PlatformUsageHeatmapSection } from "@/modules/platform/usage/PlatformUsageHeatmapSection";

export function PlatformUsagePortfolioView() {
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [tenantFilterId, setTenantFilterId] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");

  const iso = toIsoDateTimeRange(dateRange);
  const periodDays = Math.max(1, Math.round((Date.parse(iso.to) - Date.parse(iso.from)) / 86_400_000));

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

  const { data: heatmap } = useQuery({
    queryKey: ["platform-usage-heatmap", iso.from, iso.to, includeDemo, tenantFilterId],
    queryFn: () =>
      api.getPlatformUsageHeatmap({
        from: iso.from,
        to: iso.to,
        includeDemo,
        tenantId: tenantFilterId || undefined,
      }),
  });

  const { data: insights, isLoading: insightsLoading, isError: insightsError } = useQuery({
    queryKey: ["platform-usage-insights-portfolio", iso.from, iso.to, includeDemo],
    queryFn: () => api.getPlatformUsageInsightsPortfolio({ from: iso.from, to: iso.to, includeDemo }),
  });

  const platformChart = useMemo(() => {
    if (!data?.dailyActiveUsers?.length) return null;
    const labels = data.dailyActiveUsers.map((d) =>
      new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
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
          Usage metrics could not be loaded from storage. Brand list and provisioned users are still shown below —
          contact platform ops if this persists.
        </AlertBanner>
      )}

      {data && data.telemetryReady !== false && data.platformSummary.totalEvents === 0 && (
        <AlertBanner variant="info">
          No product usage recorded in this date range yet. Metrics appear after teams use employee, manager, and
          admin apps (screen views and sign-ins). Widen the range or check back after the hourly rollup.
        </AlertBanner>
      )}

      {isLoading && !data && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading…</Card>
      )}

      {insightsLoading && !insights && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading adoption insights…</Card>
      )}
      {insightsError && (
        <AlertBanner variant="warning">Adoption insights could not be loaded. Other sections below are unaffected.</AlertBanner>
      )}
      {insights && (
        <PortfolioInsights
          data={insights}
          brandSearch={tenantSearch}
          brandFilterId={tenantFilterId}
          periodDays={periodDays}
        />
      )}

      {heatmap && <PlatformUsageHeatmapSection data={heatmap} mode="portfolio" />}

      {data && (
        <Card className="min-w-0 overflow-x-auto">
          {platformChart ?? (
            <p className="text-sm text-center text-[var(--text-tertiary)] py-12">No platform activity in range.</p>
          )}
        </Card>
      )}
    </div>
  );
}
