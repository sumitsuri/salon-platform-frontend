"use client";

import { useTranslations } from "next-intl";
import { ClipboardList, Contact, Package, Scissors, Users } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { AdminHubActionLink } from "@/components/admin/AdminHubActionLink";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

export default function AdminOpsHubPage() {
  const t = useTranslations("admin.opsHub");
  const tNav = useTranslations("admin.layout.nav");

  return (
    <AdminPageShell width="hub">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="space-y-2.5">
        <AdminHubActionLink
          href="/admin/bookings"
          icon={ClipboardList}
          label={tNav("bookings")}
          description={t("bookingsHint")}
          accent="sky"
        />
        <AdminHubActionLink
          href="/admin/customers"
          icon={Contact}
          label={tNav("customers")}
          description={t("customersHint")}
          accent="brand"
        />
        <AdminHubActionLink
          href="/admin/services"
          icon={Scissors}
          label={tNav("services")}
          description={t("servicesHint")}
          accent="violet"
        />
        <AdminHubActionLink
          href="/admin/inventory"
          icon={Package}
          label={tNav("inventory")}
          description={t("inventoryHint")}
          accent="amber"
        />
        <AdminHubActionLink
          href="/admin/employees"
          icon={Users}
          label={tNav("employees")}
          description={t("employeesHint")}
          accent="emerald"
        />
      </div>
    </AdminPageShell>
  );
}
