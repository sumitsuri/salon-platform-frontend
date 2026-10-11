"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type HeatmapCell = {
  rowId: string;
  colId: string;
  value: number;
  title?: string;
};

type Props = {
  rowLabels: { id: string; label: string }[];
  colLabels: { id: string; label: string }[];
  cells: HeatmapCell[];
  emptyMessage?: string;
  onCellClick?: (rowId: string, colId: string, value: number) => void;
  className?: string;
  valueSuffix?: string;
};

function intensityClass(ratio: number): string {
  if (ratio <= 0) return "bg-[var(--surface-muted)]/40 text-[var(--text-tertiary)]";
  if (ratio < 0.2) return "bg-teal-100/90 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100";
  if (ratio < 0.45) return "bg-teal-200/90 text-teal-950 dark:bg-teal-900/60 dark:text-teal-50";
  if (ratio < 0.7) return "bg-teal-400/85 text-teal-950 dark:bg-teal-700/70 dark:text-white";
  return "bg-teal-600 text-white dark:bg-teal-500";
}

export function UsageHeatmap({
  rowLabels,
  colLabels,
  cells,
  emptyMessage = "No activity in this slice.",
  onCellClick,
  className,
  valueSuffix = "",
}: Props) {
  const { lookup, max } = useMemo(() => {
    const map = new Map<string, number>();
    let peak = 0;
    for (const c of cells) {
      const k = `${c.rowId}\0${c.colId}`;
      map.set(k, c.value);
      if (c.value > peak) peak = c.value;
    }
    return { lookup: map, max: peak };
  }, [cells]);

  if (rowLabels.length === 0 || colLabels.length === 0) {
    return <p className="text-sm text-center text-[var(--text-tertiary)] py-8">{emptyMessage}</p>;
  }

  return (
    <div className={cn("overflow-x-auto min-w-0", className)}>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--surface-card)] p-2 text-left font-medium text-[var(--text-secondary)] min-w-[8rem]" />
            {colLabels.map((col) => (
              <th
                key={col.id}
                className="p-2 text-center font-medium text-[var(--text-secondary)] whitespace-nowrap min-w-[3.25rem]"
                title={col.label}
              >
                <span className="block truncate max-w-[5rem] mx-auto">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((row) => (
            <tr key={row.id} className="border-t border-[var(--border-subtle)]">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-[var(--surface-card)] p-2 text-left font-medium text-[var(--text-primary)] truncate max-w-[10rem]"
                title={row.label}
              >
                {row.label}
              </th>
              {colLabels.map((col) => {
                const value = lookup.get(`${row.id}\0${col.id}`) ?? 0;
                const ratio = max > 0 ? value / max : 0;
                const clickable = value > 0 && onCellClick;
                return (
                  <td key={col.id} className="p-0.5">
                    <button
                      type="button"
                      disabled={!clickable}
                      title={
                        cells.find((c) => c.rowId === row.id && c.colId === col.id)?.title ??
                        `${row.label} · ${col.label}: ${value}${valueSuffix}`
                      }
                      onClick={() => clickable && onCellClick?.(row.id, col.id, value)}
                      className={cn(
                        "w-full min-h-[2rem] rounded-md tabular-nums text-[10px] font-semibold transition-opacity",
                        intensityClass(ratio),
                        clickable && "cursor-pointer hover:ring-2 hover:ring-teal-500/40",
                        !clickable && "cursor-default",
                      )}
                    >
                      {value > 0 ? value : "·"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Build row/col defs and cells from flat tenant × portal records. */
export function buildMatrixFromFlat<T extends { rowId: string; rowLabel: string; colId: string; value: number }>(
  rows: T[],
): {
  rowLabels: { id: string; label: string }[];
  colLabels: { id: string; label: string }[];
  cells: HeatmapCell[];
} {
  const rowMap = new Map<string, string>();
  const colMap = new Map<string, string>();
  for (const r of rows) {
    rowMap.set(r.rowId, r.rowLabel);
    colMap.set(r.colId, r.colId);
  }
  const rowLabels = [...rowMap.entries()].map(([id, label]) => ({ id, label }));
  const colLabels = [...colMap.keys()]
    .sort()
    .map((id) => ({ id, label: portalDisplayName(id) }));
  const cells: HeatmapCell[] = rows.map((r) => ({
    rowId: r.rowId,
    colId: r.colId,
    value: r.value,
    title: `${r.rowLabel} · ${portalDisplayName(r.colId)}: ${r.value}`,
  }));
  return { rowLabels, colLabels, cells };
}

export function portalDisplayName(portal: string): string {
  switch (portal) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    case "auth":
      return "Sign-in";
    case "unknown":
    case "other":
      return "Other";
    default:
      return portal.charAt(0).toUpperCase() + portal.slice(1);
  }
}
