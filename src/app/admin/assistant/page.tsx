"use client";

import { useTranslations } from "next-intl";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AssistantChat } from "@/components/admin/assistant/AssistantChat";
import { PageHeader } from "@/components/ui";

export default function AdminAssistantPage() {
  const t = useTranslations("admin.assistant");
  return (
    <AdminPageShell>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <AssistantChat />
    </AdminPageShell>
  );
}
