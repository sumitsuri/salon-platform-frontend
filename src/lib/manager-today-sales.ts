import type { Booking } from "@/lib/api";
import type { EmployeeSalesRow } from "@/components/enterprise-ui";
import { lineFinalAmount, lineListAmount } from "@/lib/booking-line-revenue";

type StaffAccumulator = {
  staffId: string;
  staffName: string;
  serviceCount: number;
  listRevenue: number;
  finalRevenue: number;
};

/** Today’s completed visits — list vs final (discounted) revenue by stylist. */
export function aggregateTodayEmployeeSales(completedBookings: Booking[]): EmployeeSalesRow[] {
  const byStaff = new Map<string, StaffAccumulator>();

  for (const booking of completedBookings) {
    for (const line of booking.lines ?? []) {
      if (!line.staffId) continue;
      const qty = Math.max(1, line.quantity ?? 1);
      const listRevenue = lineListAmount(line);
      const finalRevenue = lineFinalAmount(booking, line);
      const existing = byStaff.get(line.staffId);
      if (existing) {
        existing.serviceCount += qty;
        existing.listRevenue += listRevenue;
        existing.finalRevenue += finalRevenue;
      } else {
        byStaff.set(line.staffId, {
          staffId: line.staffId,
          staffName: line.staffName || "—",
          serviceCount: qty,
          listRevenue,
          finalRevenue,
        });
      }
    }
  }

  return [...byStaff.values()]
    .map((row) => ({
      staffId: row.staffId,
      staffName: row.staffName,
      salesCount: row.serviceCount,
      totalListSales: row.listRevenue,
      totalFinalSales: row.finalRevenue,
      totalSales: row.finalRevenue,
      avgTicketSize: row.serviceCount > 0 ? row.finalRevenue / row.serviceCount : 0,
      avgListTicketSize: row.serviceCount > 0 ? row.listRevenue / row.serviceCount : 0,
    }))
    .sort((a, b) => b.totalFinalSales - a.totalFinalSales || b.salesCount - a.salesCount);
}
