/**
 * High-contrast chart palettes — hues spaced for clear branch/series distinction.
 * Avoid adjacent indigo/violet pairs that read as the same on small charts.
 */
export const BRANCH_SERIES_COLORS = [
  "#2563EB", // blue
  "#EA580C", // orange
  "#059669", // emerald
  "#DB2777", // pink
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#CA8A04", // amber
  "#DC2626", // red
] as const;

/** Staff lines within a branch chart — offset from branch color index */
export const STAFF_SERIES_COLORS = [
  "#2563EB",
  "#EA580C",
  "#059669",
  "#DB2777",
  "#7C3AED",
  "#0891B2",
  "#CA8A04",
  "#DC2626",
  "#4F46E5",
  "#0D9488",
] as const;

export const ATTENDANCE_CHART_COLORS = {
  present: "#2563EB",
  hours: "#059669",
} as const;

export function seriesColor(index: number, palette: readonly string[] = BRANCH_SERIES_COLORS): string {
  return palette[index % palette.length];
}

/** @deprecated Use BRANCH_SERIES_COLORS */
export const BRANCH_COLORS = BRANCH_SERIES_COLORS;
