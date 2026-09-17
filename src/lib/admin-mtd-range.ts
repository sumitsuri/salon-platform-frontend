import { ProductDateRange, resolveProductDateRange } from "@/lib/date-range";
import type { BranchTargetPerformanceItem } from "@/lib/api";

function monthStartIso(isoEnd: string): string {
  const d = new Date(`${isoEnd}T12:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Month-to-date through the dashboard range end date (Asia/Kolkata calendar month). */
export function adminMtdSalesRange(range: ProductDateRange): { from: string; to: string } {
  const resolved = resolveProductDateRange(range);
  return { from: monthStartIso(resolved.to), to: resolved.to };
}

export type BrandTargetAggregate = {
  monthlyTarget: number;
  actualSales: number;
  achievementPercent: number;
  expectedSalesSoFar: number;
  gapVsExpected: number;
  laggingToTarget: number;
  catchUpDailyAverage: number;
  dailyAverageActual: number;
  dailyAverageExpected: number;
  daysElapsed: number;
  daysInMonth: number;
  branchesWithTarget: number;
};

export function aggregateBrandTargetMetrics(
  branches: BranchTargetPerformanceItem[],
): BrandTargetAggregate {
  const monthlyTarget = branches.reduce((sum, b) => sum + (b.monthlySalesTarget ?? 0), 0);
  const actualSales = branches.reduce((sum, b) => sum + (b.actualSales ?? 0), 0);

  const ref = branches.find((b) => b.daysInMonth != null) ?? branches[0];
  const daysInMonth = ref?.daysInMonth ?? 30;
  const daysElapsed = ref?.daysElapsed ?? 1;

  let achievementPercent = 0;
  let expectedSalesSoFar = 0;
  let dailyAverageExpected = 0;
  let dailyAverageActual = 0;
  let catchUpDailyAverage = 0;

  if (monthlyTarget > 0) {
    achievementPercent = (actualSales / monthlyTarget) * 100;
    expectedSalesSoFar = (monthlyTarget * daysElapsed) / daysInMonth;
    dailyAverageExpected = monthlyTarget / daysInMonth;
    if (daysElapsed > 0) {
      dailyAverageActual = actualSales / daysElapsed;
    }
    const remainingDays = Math.max(0, daysInMonth - daysElapsed);
    if (remainingDays > 0 && actualSales < monthlyTarget) {
      catchUpDailyAverage = (monthlyTarget - actualSales) / remainingDays;
    }
  }

  const gapVsExpected = actualSales - expectedSalesSoFar;
  const laggingToTarget = Math.max(0, monthlyTarget - actualSales);
  const branchesWithTarget = branches.filter((b) => (b.monthlySalesTarget ?? 0) > 0).length;

  return {
    monthlyTarget,
    actualSales,
    achievementPercent,
    expectedSalesSoFar,
    gapVsExpected,
    laggingToTarget,
    catchUpDailyAverage,
    dailyAverageActual,
    dailyAverageExpected,
    daysElapsed,
    daysInMonth,
    branchesWithTarget,
  };
}
