"use client";

import { useTranslations } from "next-intl";
import { ClipboardList, Contact, Package, Scissors, Users } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { AdminHubActionLink } from "@/components/admin/AdminHubActionLink";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { OpsHubKpis, OpsModuleTile, useOpsHubData } from "@/components/admin/OpsHubOverview";
import { useMediaQuery } from "@/lib/use-media-query";
import { formatCurrency } from "@/lib/utils";

const DASH = "–";
const num = (n: number | undefined) => (n == null ? DASH : String(n));

export default function AdminOpsHubPage() {
  const t = useTranslations("admin.opsHub");
  const tNav = useTranslations("admin.layout.nav");
  // Phones keep the plain module list; tablet/desktop get a launcher with each module's own live figures.
  const wide = useMediaQuery("(min-width: 768px)");
  const data = useOpsHubData(wide);

  if (!wide) {
    return (
      <AdminPageShell width="hub">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="space-y-2.5">
          <AdminHubActionLink href="/admin/bookings" icon={ClipboardList} label={tNav("bookings")} description={t("bookingsHint")} accent="sky" />
          <AdminHubActionLink href="/admin/customers" icon={Contact} label={tNav("customers")} description={t("customersHint")} accent="brand" />
          <AdminHubActionLink href="/admin/services" icon={Scissors} label={tNav("services")} description={t("servicesHint")} accent="violet" />
          <AdminHubActionLink href="/admin/inventory" icon={Package} label={tNav("inventory")} description={t("inventoryHint")} accent="amber" />
          <AdminHubActionLink href="/admin/employees" icon={Users} label={tNav("employees")} description={t("employeesHint")} accent="emerald" />
        </div>
      </AdminPageShell>
    );
  }

  const { todayDashboard, dashboard, attendance, inventory, catalog } = data;

  return (
    <AdminPageShell width="hub" className="md:flex md:flex-col md:gap-4 md:min-h-[calc(100dvh-10.5rem)] nav:min-h-[calc(100dvh-6rem)]">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <OpsHubKpis data={data} />

      <div className="grid flex-1 auto-rows-fr gap-4 md:grid-cols-2 hub:grid-cols-6" data-testid="ops-hub-tiles">
        <OpsModuleTile
          className="hub:col-span-2"
          href="/admin/bookings"
          icon={ClipboardList}
          label={tNav("bookings")}
          description={t("bookingsHint")}
          accent="sky"
          metrics={[
            { id: "today", label: t("metricVisitsToday"), value: num(todayDashboard?.totalVisits) },
            { id: "progress", label: t("metricInProgress"), value: num(data.openInProgress) },
            { id: "ready", label: t("metricReadyToBill"), value: num(data.openReadyToBill), tone: (data.openReadyToBill ?? 0) > 0 ? "warn" : "default" },
          ]}
        />
        <OpsModuleTile
          className="hub:col-span-2"
          href="/admin/customers"
          icon={Contact}
          label={tNav("customers")}
          description={t("customersHint")}
          accent="brand"
          metrics={[
            { id: "guests", label: t("metricGuests"), value: num(data.customerCount) },
            { id: "active", label: t("metricActive30"), value: num(data.activeCustomerCount) },
            { id: "ticket", label: t("metricAvgTicket"), value: dashboard ? formatCurrency(dashboard.avgTicketSize) : DASH },
          ]}
          progress={
            data.customerCount && data.activeCustomerCount != null
              ? {
                  ratio: data.activeCustomerCount / data.customerCount,
                  caption: t("progressActiveGuests", { percent: Math.round((data.activeCustomerCount / data.customerCount) * 100) }),
                }
              : undefined
          }
        />
        <OpsModuleTile
          className="hub:col-span-2"
          href="/admin/services"
          icon={Scissors}
          label={tNav("services")}
          description={t("servicesHint")}
          accent="violet"
          metrics={[
            { id: "services", label: t("metricServices"), value: num(catalog?.count) },
            { id: "categories", label: t("metricCategories"), value: num(catalog?.categories) },
            { id: "price", label: t("metricAvgPrice"), value: catalog ? formatCurrency(catalog.avgPrice) : DASH },
          ]}
        />
        <OpsModuleTile
          className="hub:col-span-3"
          href="/admin/inventory"
          icon={Package}
          label={tNav("inventory")}
          description={t("inventoryHint")}
          accent="amber"
          metrics={[
            { id: "value", label: t("metricStockValue"), value: inventory ? formatCurrency(inventory.totalStockValue) : DASH },
            { id: "low", label: t("metricLowStock"), value: num(inventory?.lowStockCount), tone: (inventory?.lowStockCount ?? 0) > 0 ? "warn" : "default" },
            { id: "out", label: t("metricOutOfStock"), value: num(inventory?.outOfStockCount), tone: (inventory?.outOfStockCount ?? 0) > 0 ? "risk" : "default" },
          ]}
        />
        <OpsModuleTile
          className="md:col-span-2 hub:col-span-3"
          href="/admin/employees"
          icon={Users}
          label={tNav("employees")}
          description={t("employeesHint")}
          accent="emerald"
          metrics={[
            { id: "present", label: t("metricPresent"), value: num(attendance?.presentToday) },
            { id: "absent", label: t("metricAbsent"), value: num(attendance?.absentToday), tone: (attendance?.absentToday ?? 0) > 0 ? "warn" : "default" },
            { id: "leave", label: t("metricOnLeave"), value: num(attendance?.onLeaveToday) },
          ]}
          progress={
            attendance && attendance.totalStaff > 0
              ? {
                  ratio: attendance.presentToday / attendance.totalStaff,
                  caption: t("progressAttendance", { present: attendance.presentToday, total: attendance.totalStaff }),
                }
              : undefined
          }
        />
      </div>
    </AdminPageShell>
  );
}
