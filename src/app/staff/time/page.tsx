"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader, SegmentedControl } from "@/components/ui";
import { StaffPageShell } from "@/components/staff/StaffPageShell";
import { StaffAttendanceSection } from "@/components/staff/StaffAttendanceSection";
import { StaffLeavesSection } from "@/components/staff/StaffLeavesSection";

export default function StaffTimePage() {
  const t = useTranslations("staff.time");
  const [tab, setTab] = useState<"attendance" | "leave">("attendance");

  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={t("subtitleCompact")} />
      <div className="lg:hidden mb-2">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { id: "attendance", label: t("tabAttendance") },
            { id: "leave", label: t("tabLeave") },
          ]}
        />
      </div>
      <div className="grid gap-2 md:gap-3 lg:grid-cols-2 lg:items-start min-w-0">
        <div className={tab === "leave" ? "hidden lg:block" : undefined}>
          <StaffAttendanceSection />
        </div>
        <div className={tab === "attendance" ? "hidden lg:block" : undefined}>
          <StaffLeavesSection />
        </div>
      </div>
    </StaffPageShell>
  );
}
