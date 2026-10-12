"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, ChevronRight } from "lucide-react";
import { PageHeader, SegmentedControl } from "@/components/ui";
import { StaffPageShell } from "@/components/employee/StaffPageShell";
import { StaffAttendanceSection } from "@/components/employee/StaffAttendanceSection";
import { StaffLeavesSection } from "@/components/employee/StaffLeavesSection";
import { StaffPayrollCoachNote } from "@/components/employee/StaffPayrollCoachNote";

export default function StaffTimePage() {
  const t = useTranslations("employee.time");
  const [tab, setTab] = useState<"attendance" | "leave">("attendance");

  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={t("subtitleCompact")} />
      <StaffPayrollCoachNote className="mb-1" />
      <Link
        href="/employee/advance"
        className="mb-1 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 touch-manipulation hover:bg-[var(--surface-muted)]/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <Banknote className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[var(--text-primary)]">{t("advanceLinkTitle")}</span>
          <span className="block truncate text-xs text-[var(--text-secondary)]">{t("advanceLinkHint")}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      </Link>
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
