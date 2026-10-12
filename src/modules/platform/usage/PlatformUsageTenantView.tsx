"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, UserRole } from "@/lib/api";
import { getDefaultDateRange, toIsoDateTimeRange, type ProductDateRange } from "@/lib/date-range";
import { AlertBanner, Card, PageHeader } from "@/components/ui";
import { PlatformUsageFilterBar } from "@/modules/platform/usage/PlatformUsageFilterBar";
import { TenantInsights } from "@/modules/platform/usage/insights/TenantInsights";
import { PlatformUsageHeatmapSection } from "@/modules/platform/usage/PlatformUsageHeatmapSection";

type Props = { tenantId: string };

export function PlatformUsageTenantView({ tenantId }: Props) {
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [branchId, setBranchId] = useState(() => searchParams.get("branchId") ?? "");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");

  const iso = toIsoDateTimeRange(dateRange);
  const periodDays = Math.max(1, Math.round((Date.parse(iso.to) - Date.parse(iso.from)) / 86_400_000));

  const { data: branches = [] } = useQuery({
    queryKey: ["platform-branches", tenantId],
    queryFn: () => api.getPlatformBranches(tenantId),
  });

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["platform-users", tenantId],
    queryFn: () => api.getPlatformUsers(tenantId),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["platform-usage-analytics", tenantId, iso.from, iso.to, branchId, userId, role, search],
    queryFn: () =>
      api.getPlatformUsageAnalytics(tenantId, {
        from: iso.from,
        to: iso.to,
        branchId: branchId || undefined,
        userId: userId || undefined,
        role: (role || undefined) as UserRole | undefined,
        search: search.trim() || undefined,
      }),
  });

  const { data: insights, isLoading: insightsLoading, isError: insightsError } = useQuery({
    queryKey: ["platform-usage-insights-tenant", tenantId, iso.from, iso.to, branchId],
    queryFn: () =>
      api.getPlatformUsageInsightsTenant(tenantId, {
        from: iso.from,
        to: iso.to,
        branchId: branchId || undefined,
      }),
  });

  const { data: heatmap } = useQuery({
    queryKey: ["platform-usage-heatmap", tenantId, iso.from, iso.to, branchId],
    queryFn: () =>
      api.getPlatformUsageHeatmap({
        from: iso.from,
        to: iso.to,
        tenantId,
        branchId: branchId || undefined,
      }),
  });

  const userOptions = useMemo(
    () => directoryUsers.map((u) => ({ id: u.id, name: u.name })),
    [directoryUsers],
  );

  return (
    <div className="space-y-4 min-w-0">
      <Link
        href="/platform/usage"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} />
        All brands
      </Link>

      <PageHeader
        title={data?.tenantName ?? "Brand usage"}
        subtitle={
          data?.summary
            ? `WAU ${data.summary.wau} · MAU ${data.summary.mau} · ${data.summary.activeUsersInRange} active in range · ${data.summary.totalEvents} events · ${data.summary.distinctFeatures} features`
            : "Product adoption for this brand"
        }
      />

      <PlatformUsageFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        branches={branches}
        branchId={branchId}
        onBranchIdChange={setBranchId}
        userId={userId}
        onUserIdChange={setUserId}
        users={userOptions}
        role={role}
        onRoleChange={setRole}
        search={search}
        onSearchChange={setSearch}
      />

      {isError && (
        <AlertBanner variant="error">
          {error instanceof Error ? error.message : "Failed to load usage analytics"}
        </AlertBanner>
      )}

      {isLoading && !data && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading analytics…</Card>
      )}

      {data && data.telemetryReady === false && (
        <AlertBanner variant="warning">
          Usage metrics could not be loaded from storage. User directory is still shown — contact platform ops if this
          persists.
        </AlertBanner>
      )}

      {data && data.telemetryReady !== false && data.summary.totalEvents === 0 && (
        <AlertBanner variant="info">
          No usage events in this period yet. Data appears when teams use employee, manager, and admin apps after
          sign-in. Try widening the date range or clearing branch/user filters.
        </AlertBanner>
      )}

      {insightsLoading && !insights && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading adoption insights…</Card>
      )}
      {insightsError && (
        <AlertBanner variant="warning">Adoption insights could not be loaded for this brand.</AlertBanner>
      )}
      {insights && insights.totals.events === 0 && (
        <AlertBanner variant="info">
          No usage events in this period yet. Data appears when teams use employee, manager, and admin apps after
          sign-in. Try widening the date range or clearing branch/user filters.
        </AlertBanner>
      )}
      {insights && (
        <TenantInsights
          data={insights}
          analytics={data}
          userFilters={{ userId, role, search }}
          onSelectBranch={(id) => setBranchId(id)}
          periodDays={periodDays}
        />
      )}

      {heatmap && (
        <PlatformUsageHeatmapSection data={heatmap} mode="tenant" tenantId={tenantId} />
      )}
    </div>
  );
}
