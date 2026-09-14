import type { EmployeeSalesRow } from "@/components/enterprise-ui";
import type { StaffSalesPerformanceRow, StaffTargetPerformanceItem } from "@/lib/api";

export function staffSalesRowsFromAnalytics(rows: StaffSalesPerformanceRow[]): EmployeeSalesRow[] {
  return rows.map((row) => ({
    staffId: row.staffId,
    staffName: row.staffName,
    salesCount: row.salesCount,
    totalListSales: row.listRevenue,
    totalFinalSales: row.finalRevenue,
    totalSales: row.finalRevenue,
    avgTicketSize: row.avgFinalTicket,
    avgListTicketSize: row.salesCount > 0 ? row.listRevenue / row.salesCount : 0,
  }));
}

export function staffSalesRowsFromTargetPerformance(staff: StaffTargetPerformanceItem[]): EmployeeSalesRow[] {
  return staff.map((s) => {
    const finalRevenue = s.actualSales ?? 0;
    const listRevenue = s.listSales ?? finalRevenue;
    const count = s.salesCount ?? 0;
    return {
      staffId: s.staffId,
      staffName: s.staffName,
      salesCount: count,
      totalListSales: listRevenue,
      totalFinalSales: finalRevenue,
      totalSales: finalRevenue,
      avgTicketSize: s.avgTicketSize ?? (count > 0 ? finalRevenue / count : 0),
      avgListTicketSize: count > 0 ? listRevenue / count : 0,
    };
  });
}
