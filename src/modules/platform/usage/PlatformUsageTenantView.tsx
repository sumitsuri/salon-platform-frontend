"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, PlatformUsageAnalytics, UserRole } from "@/lib/api";
import { getDefaultDateRange, toIsoDateTimeRange, type ProductDateRange } from "@/lib/date-range";
import { MetricChart } from "@/components/LineChart";
import { BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { AlertBanner, Card, PageHeader } from "@/components/ui";
import { PlatformUsageFilterBar } from "@/modules/platform/usage/PlatformUsageFilterBar";
import { UsageStandardTable } from "@/modules/platform/usage/UsageStandardTable";
import { featureLabel } from "@/modules/platform/usage/feature-labels";

function formatInstant(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type Props = { tenantId: string };

export function PlatformUsageTenantView({ tenantId }: Props) {
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [branchId, setBranchId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");

  const iso = toIsoDateTimeRange(dateRange);

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

  const userOptions = useMemo(
    () => directoryUsers.map((u) => ({ id: u.id, name: u.name })),
    [directoryUsers],
  );

  const dailyChart = useMemo(() => {
    if (!data?.dailyActiveUsers?.length) return null;
    const labels = data.dailyActiveUsers.map((d) => d.date.slice(5));
    return (
      <MetricChart
        title="Daily active users"
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

  const featureChart = useMemo(() => {
    const top = (data?.featureUsage ?? []).slice(0, 12);
    if (top.length === 0) return null;
    return (
      <MetricChart
        title="Feature usage (top 12)"
        labels={top.map((f) => featureLabel(f.featureKey).slice(0, 18))}
        series={[
          {
            name: "Hits",
            color: BRANCH_SERIES_COLORS[2],
            values: top.map((f) => f.hitCount),
          },
        ]}
      />
    );
  }, [data?.featureUsage]);

  const branchChart = useMemo(() => {
    const rows = data?.branchUsage ?? [];
    if (rows.length === 0) return null;
    return (
      <MetricChart
        title="Activity by branch"
        labels={rows.map((b) => b.branchCode || b.branchName.slice(0, 10))}
        series={[
          {
            name: "Events",
            color: BRANCH_SERIES_COLORS[3],
            values: rows.map((b) => b.eventCount),
          },
        ]}
      />
    );
  }, [data?.branchUsage]);

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

      {data && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
            <Card className="min-w-0 overflow-x-auto">{dailyChart ?? <EmptyChart label="Daily active users" />}</Card>
            <Card className="min-w-0 overflow-x-auto">{featureChart ?? <EmptyChart label="Feature usage" />}</Card>
          </div>
          {branchChart && (
            <Card className="min-w-0 overflow-x-auto">{branchChart}</Card>
          )}

          <UsageStandardTable
            title="Feature breakdown"
            rows={data.featureUsage}
            rowKey={(r) => r.featureKey}
            emptyMessage="No feature events in this period."
            toolbar={
              <span className="text-xs text-[var(--text-tertiary)]">{data.featureUsage.length} features</span>
            }
            columns={[
              {
                id: "feature",
                header: "Feature",
                mobileLabel: "Feature",
                cell: (r) => (
                  <div>
                    <p className="font-medium">{featureLabel(r.featureKey)}</p>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono">{r.featureKey}</p>
                  </div>
                ),
              },
              {
                id: "hits",
                header: "Hits",
                cell: (r) => <span className="tabular-nums">{r.hitCount}</span>,
              },
              {
                id: "users",
                header: "Unique users",
                cell: (r) => <span className="tabular-nums">{r.uniqueUsers}</span>,
              },
            ]}
          />

          <UsageStandardTable
            title="Branches"
            rows={data.branchUsage}
            rowKey={(r) => r.branchId ?? "unassigned"}
            emptyMessage="No branch-level activity in this period."
            columns={[
              {
                id: "branch",
                header: "Branch",
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.branchName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{r.branchCode}</p>
                  </div>
                ),
              },
              {
                id: "active",
                header: "Active users",
                cell: (r) => r.activeUsers,
              },
              {
                id: "events",
                header: "Events",
                cell: (r) => r.eventCount,
              },
              {
                id: "top",
                header: "Top feature",
                cell: (r) => (r.topFeatureKey ? featureLabel(r.topFeatureKey) : "—"),
              },
            ]}
          />

          <UsageStandardTable
            title="Users"
            rows={data.users}
            rowKey={(r) => r.userId}
            emptyMessage="No users match these filters."
            columns={[
              {
                id: "name",
                header: "Name",
                cell: (r) => (
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{r.email}</p>
                  </div>
                ),
              },
              {
                id: "role",
                header: "Role",
                cell: (r) => r.role.replace(/_/g, " "),
              },
              {
                id: "branch",
                header: "Branch",
                cell: (r) => r.branchName ?? "—",
              },
              {
                id: "events",
                header: "Events (range)",
                cell: (r) => r.eventsInRange,
              },
              {
                id: "features",
                header: "Features used",
                cell: (r) => r.featuresUsedInRange,
              },
              {
                id: "last",
                header: "Last seen",
                cell: (r) => formatInstant(r.lastSeenAt),
              },
              {
                id: "status",
                header: "Status",
                cell: (r) =>
                  !r.everLoggedIn ? (
                    <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">Never signed in</span>
                  ) : r.active ? (
                    <span className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">Active</span>
                  ) : (
                    <span className="text-[var(--text-tertiary)] text-xs">Inactive</span>
                  ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <p className="text-sm text-center text-[var(--text-tertiary)] py-12">
      No data for <span className="font-medium">{label}</span> in this period.
    </p>
  );
}
