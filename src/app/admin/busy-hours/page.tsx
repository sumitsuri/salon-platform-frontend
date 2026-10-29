"use client";

import { useTranslations } from "next-intl";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { BusyHours } from "@/components/admin/busy/BusyHours";
import { PageHeader } from "@/components/ui";

export default function AdminBusyHoursPage() {
  const t = useTranslations("admin.busyHours");
  return (
    <AdminPageShell>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <BusyHours />
    </AdminPageShell>
  );
}
