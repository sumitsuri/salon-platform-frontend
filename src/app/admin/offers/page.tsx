"use client";

import { useTranslations } from "next-intl";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { OfferStudio } from "@/components/admin/offers/OfferStudio";
import { PageHeader } from "@/components/ui";

export default function AdminOffersPage() {
  const t = useTranslations("admin.offerStudio");
  return (
    <AdminPageShell>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <OfferStudio />
    </AdminPageShell>
  );
}
