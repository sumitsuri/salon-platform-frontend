"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import { StaffPageShell } from "@/components/employee/StaffPageShell";
import { StaffAdvanceSection } from "@/components/employee/StaffAdvanceSection";

export default function StaffAdvancePage() {
  const t = useTranslations("employee.advance");
  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <StaffAdvanceSection />
    </StaffPageShell>
  );
}
