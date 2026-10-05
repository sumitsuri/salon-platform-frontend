"use client";

import { useTranslations } from "next-intl";
import { ClipboardList, Contact, Package, Scissors, Users } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { AdminHubActionLink } from "@/components/admin/AdminHubActionLink";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { OpsHubKpis, OpsHubPanels, useOpsHubData } from "@/components/admin/OpsHubOverview";
import { useMediaQuery } from "@/lib/use-media-query";

export default function AdminOpsHubPage() {
  const t = useTranslations("admin.opsHub");
  const tNav = useTranslations("admin.layout.nav");
  // Phones keep the plain module list; tablet/desktop add live figures and insight panels.
  const wide = useMediaQuery("(min-width: 768px)");
  const data = useOpsHubData(wide);

  const lowStock = (data.inventory?.lowStockCount ?? 0) + (data.inventory?.outOfStockCount ?? 0);

  return (
    <AdminPageShell width="hub">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {wide ? <OpsHubKpis data={data} /> : null}

      <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 hub:grid-cols-3">
        <AdminHubActionLink
          href="/admin/bookings"
          icon={ClipboardList}
          label={tNav("bookings")}
          description={t("bookingsHint")}
          accent="sky"
          stat={wide && data.dashboard ? t("statVisits", { count: data.dashboard.totalVisits }) : undefined}
        />
        <AdminHubActionLink
          href="/admin/customers"
          icon={Contact}
          label={tNav("customers")}
          description={t("customersHint")}
          accent="brand"
          stat={wide && data.customerCount != null ? t("statGuests", { count: data.customerCount }) : undefined}
        />
        <AdminHubActionLink
          href="/admin/services"
          icon={Scissors}
          label={tNav("services")}
          description={t("servicesHint")}
          accent="violet"
          stat={wide && data.serviceCount != null ? t("statServices", { count: data.serviceCount }) : undefined}
        />
        <AdminHubActionLink
          href="/admin/inventory"
          icon={Package}
          label={tNav("inventory")}
          description={t("inventoryHint")}
          accent="amber"
          stat={wide && data.inventory ? (lowStock > 0 ? t("statLowStock", { count: lowStock }) : t("statStockOk")) : undefined}
          statTone={lowStock > 0 ? "warn" : "default"}
        />
        <AdminHubActionLink
          href="/admin/employees"
          icon={Users}
          label={tNav("employees")}
          description={t("employeesHint")}
          accent="emerald"
          stat={
            wide && data.attendance
              ? t("statPresent", { present: data.attendance.presentToday, total: data.attendance.totalStaff })
              : undefined
          }
        />
      </div>

      {wide ? <OpsHubPanels data={data} /> : null}
    </AdminPageShell>
  );
}
