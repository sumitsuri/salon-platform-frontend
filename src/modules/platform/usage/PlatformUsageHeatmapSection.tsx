"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PlatformUsageHeatmap } from "@/lib/api";
import { Card } from "@/components/ui";
import {
  UsageHeatmap,
  buildMatrixFromFlat,
  portalDisplayName,
  type HeatmapCell,
} from "@/modules/platform/usage/UsageHeatmap";

type Props = {
  data: PlatformUsageHeatmap | undefined;
  mode: "portfolio" | "tenant";
  tenantId?: string;
};

export function PlatformUsageHeatmapSection({ data, mode, tenantId }: Props) {
  const router = useRouter();

  const portalBars = useMemo(() => {
    const slices = data?.portals ?? [];
    if (slices.length === 0) return null;
    const max = Math.max(...slices.map((s) => s.eventCount), 1);
    return (
      <ul className="space-y-2">
        {slices.map((s) => (
          <li key={s.portal} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 font-medium">{portalDisplayName(s.portal)}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${Math.round((s.eventCount / max) * 100)}%` }}
              />
            </div>
            <span className="tabular-nums text-[var(--text-secondary)] w-16 text-right">
              {s.eventCount} ev
            </span>
            <span className="tabular-nums text-xs text-[var(--text-tertiary)] w-12 text-right">
              {s.activeUsers} u
            </span>
          </li>
        ))}
      </ul>
    );
  }, [data?.portals]);

  const tenantMatrix = useMemo(() => {
    const cells = data?.tenantPortalCells ?? [];
    if (cells.length === 0) return null;
    const flat = cells.map((c) => ({
      rowId: c.tenantId,
      rowLabel: c.tenantName,
      colId: c.portal,
      value: c.eventCount,
    }));
    return buildMatrixFromFlat(flat);
  }, [data?.tenantPortalCells]);

  const branchMatrix = useMemo(() => {
    const cells = data?.branchPortalCells ?? [];
    if (cells.length === 0) return null;
    const flat = cells.map((c) => ({
      rowId: c.branchId ?? "unassigned",
      rowLabel: c.branchName,
      colId: c.portal,
      value: c.eventCount,
    }));
    return buildMatrixFromFlat(flat);
  }, [data?.branchPortalCells]);

  const userDayMatrix = useMemo(() => {
    const cells = data?.userDayCells ?? [];
    if (cells.length === 0) return null;

    const dates = [...new Set(cells.map((c) => c.usageDate))].sort();
    const recentDates = dates.slice(-21);
    const dateSet = new Set(recentDates);

    const users = new Map<string, { label: string; role: string }>();
    for (const c of cells) {
      if (!users.has(c.userId)) {
        users.set(c.userId, {
          label: c.branchName ? `${c.userName} (${c.branchName})` : c.userName,
          role: c.role,
        });
      }
    }

    const rowLabels = [...users.entries()]
      .map(([id, meta]) => ({ id, label: meta.label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const colLabels = recentDates.map((d) => ({
      id: d,
      label: new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));

    const heatCells: HeatmapCell[] = [];
    for (const c of cells) {
      if (!dateSet.has(c.usageDate)) continue;
      heatCells.push({
        rowId: c.userId,
        colId: c.usageDate,
        value: c.eventCount,
        title: `${c.userName} · ${c.usageDate}: ${c.eventCount} events`,
      });
    }

    return { rowLabels, colLabels, cells: heatCells };
  }, [data?.userDayCells]);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Usage by app</h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            Employee, manager, and admin surfaces — event volume and active users in range
          </p>
        </div>
        {portalBars ?? (
          <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No app-level activity yet.</p>
        )}
      </Card>

      {mode === "portfolio" && tenantMatrix && (
        <Card className="p-4 space-y-3 min-w-0">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Brand × app heatmap</h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Click a cell to open that brand&apos;s drill-down (events in range)
            </p>
          </div>
          <UsageHeatmap
            {...tenantMatrix}
            onCellClick={(rowId) => {
              router.push(`/platform/usage/detail?tenantId=${encodeURIComponent(rowId)}`);
            }}
          />
        </Card>
      )}

      {mode === "tenant" && branchMatrix && (
        <Card className="p-4 space-y-3 min-w-0">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Branch × app heatmap</h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Where each branch spends time across employee, manager, and admin apps
            </p>
          </div>
          <UsageHeatmap
            {...branchMatrix}
            onCellClick={(rowId, colId) => {
              const params = new URLSearchParams();
              if (tenantId) params.set("tenantId", tenantId);
              if (rowId !== "unassigned") params.set("branchId", rowId);
              params.set("portal", colId);
              router.push(`/platform/usage/detail?${params.toString()}`);
            }}
          />
        </Card>
      )}

      {mode === "tenant" && userDayMatrix && (
        <Card className="p-4 space-y-3 min-w-0">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">User activity calendar</h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Last {userDayMatrix.colLabels.length} days with events — darker cells mean more activity that day
            </p>
          </div>
          <UsageHeatmap {...userDayMatrix} />
        </Card>
      )}
    </div>
  );
}
