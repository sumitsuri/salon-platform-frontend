"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, ClipboardCheck, Receipt } from "lucide-react";
import { PageHeader, SegmentedControl } from "@/components/ui";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { ApprovalsPanel } from "@/components/admin/requests/ApprovalsPanel";
import { BudgetPanel } from "@/components/admin/requests/BudgetPanel";
import { DeductionsPanel } from "@/components/admin/requests/DeductionsPanel";
import { useTeamRequests } from "@/components/admin/requests/use-team-requests";

type Tab = "approvals" | "budget" | "deductions";

export default function AdminTeamRequestsPage() {
  const t = useTranslations("admin.requests");
  const [tab, setTab] = useState<Tab>("approvals");
  const { pendingTotal } = useTeamRequests();

  return (
    <AdminPageShell>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SegmentedControl
        options={[
          { id: "approvals" as const, label: pendingTotal > 0 ? `${t("tabApprovals")} (${pendingTotal})` : t("tabApprovals"), icon: ClipboardCheck },
          { id: "budget" as const, label: t("tabBudget"), icon: Banknote },
          { id: "deductions" as const, label: t("tabDeductions"), icon: Receipt },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "approvals" ? <ApprovalsPanel /> : null}
      {tab === "budget" ? <BudgetPanel /> : null}
      {tab === "deductions" ? <DeductionsPanel /> : null}
    </AdminPageShell>
  );
}
