"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { StaffPageShell } from "@/components/employee/StaffPageShell";
import { StaffGoalsReadOnlyList } from "@/components/employee/StaffGoalsReadOnlyList";
import { DashboardWidgetCard } from "@/components/enterprise-ui";

export default function StaffGoalsPage() {
  const t = useTranslations("employee.goals");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["staff-portal-goals"],
    queryFn: () => api.getStaffPortalGoals(),
  });

  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={t("readOnlySubtitle")} />
      <DashboardWidgetCard>
        <div className="p-3 sm:p-4">
          <StaffGoalsReadOnlyList goals={goals} loading={isLoading} />
        </div>
      </DashboardWidgetCard>
    </StaffPageShell>
  );
}
