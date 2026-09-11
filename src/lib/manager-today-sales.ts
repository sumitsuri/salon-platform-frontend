import type { Booking } from "@/lib/api";
import type { EmployeeSalesRow } from "@/components/enterprise-ui";

type StaffAccumulator = {
  staffId: string;
  staffName: string;
  serviceCount: number;
  revenue: number;
};

/** Today’s completed visits — service count and revenue by stylist (matches invoice line logic). */
export function aggregateTodayEmployeeSales(completedBookings: Booking[]): EmployeeSalesRow[] {
  const byStaff = new Map<string, StaffAccumulator>();

  for (const booking of completedBookings) {
    for (const line of booking.lines ?? []) {
      if (!line.staffId) continue;
      const qty = Math.max(1, line.quantity ?? 1);
      const lineRevenue = line.unitPrice * qty;
      const existing = byStaff.get(line.staffId);
      if (existing) {
        existing.serviceCount += qty;
        existing.revenue += lineRevenue;
      } else {
        byStaff.set(line.staffId, {
          staffId: line.staffId,
          staffName: line.staffName || "—",
          serviceCount: qty,
          revenue: lineRevenue,
        });
      }
    }
  }

  return [...byStaff.values()]
    .map((row) => ({
      staffId: row.staffId,
      staffName: row.staffName,
      salesCount: row.serviceCount,
      totalSales: row.revenue,
      avgTicketSize: row.serviceCount > 0 ? row.revenue / row.serviceCount : 0,
    }))
    .sort((a, b) => b.totalSales - a.totalSales || b.salesCount - a.salesCount);
}
