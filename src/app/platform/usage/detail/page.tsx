"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Card, AlertBanner, StatusBadge } from "@/components/ui";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 27);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatInstant(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function PlatformTenantUsagePage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const [range] = useState(defaultRange);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["platform-tenant-usage", tenantId, range.from, range.to],
    queryFn: () => api.getPlatformTenantUsage(tenantId, range),
    enabled: Boolean(tenantId),
  });

  const maxDaily = useMemo(
    () => Math.max(1, ...(data?.dailyActiveUsers.map((d) => d.activeUsers) ?? [1])),
    [data],
  );

  if (!tenantId) {
    return (
      <AlertBanner variant="error">
        Missing tenant.{" "}
        <Link href="/platform/usage" className="underline">
          Back to all brands
        </Link>
      </AlertBanner>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/platform/usage"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} />
        All brands
      </Link>

      <PageHeader
        title={data?.tenantName ?? "Brand usage"}
        subtitle={`WAU ${data?.wau ?? "—"} · MAU ${data?.mau ?? "—"} · ${data?.provisionedUsers ?? "—"} provisioned users`}
      />

      {isError && (
        <AlertBanner variant="error">
          {error instanceof Error ? error.message : "Failed to load tenant usage"}
        </AlertBanner>
      )}

      {isLoading && !data && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading…</Card>
      )}

      {data && (
        <>
          <Card className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Daily active users
            </p>
            <div className="flex items-end gap-1 h-24">
              {data.dailyActiveUsers.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full rounded-t bg-teal-600/80 dark:bg-teal-500/70"
                    style={{ height: `${Math.max(4, (day.activeUsers / maxDaily) * 100)}%` }}
                    title={`${day.date}: ${day.activeUsers}`}
                  />
                  <span className="text-[8px] text-[var(--text-tertiary)] truncate w-full text-center">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {data.topFeatures.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                Top features
              </p>
              <ul className="space-y-1 text-sm">
                {data.topFeatures.map((f) => (
                  <li key={f.featureKey} className="flex justify-between gap-2">
                    <span className="text-[var(--text-primary)] truncate">{f.featureKey}</span>
                    <span className="text-[var(--text-tertiary)] tabular-nums">{f.hitCount}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Users
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Role</th>
                    <th className="px-4 py-2 font-medium">Last seen</th>
                    <th className="px-4 py-2 font-medium">28d active days</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.userId} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium text-[var(--text-primary)]">{u.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">{u.email}</p>
                        {u.lastFeatureKey && (
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate">{u.lastFeatureKey}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-[var(--text-secondary)]">{u.role}</td>
                      <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                        {formatInstant(u.lastSeenAt)}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{u.daysActive28d}</td>
                      <td className="px-4 py-2">
                        {!u.everLoggedIn ? (
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Never signed in</span>
                        ) : u.active ? (
                          <StatusBadge status="ACTIVE" />
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
