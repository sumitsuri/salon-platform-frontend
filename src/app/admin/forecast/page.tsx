"use client";

import { useTranslations } from "next-intl";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SalesForecast } from "@/components/admin/forecast/SalesForecast";
import { PageHeader } from "@/components/ui";

export default function AdminForecastPage() {
  const t = useTranslations("admin.forecast");
  return (
    <AdminPageShell>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SalesForecast />
    </AdminPageShell>
  );
}
