"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader, AlertBanner, btnSecondary, Card } from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { SellMembershipPanel } from "@/components/memberships/SellMembershipPanel";

export default function ManagerMembershipsPage() {
  const t = useTranslations("manager.memberships");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
  const params = useSearchParams();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initialPhone = params.get("phone") || "";
  const initialCustomerId = params.get("customerId") || "";
  const initialName = params.get("name") || "";

  return (
    <div className="space-y-4 w-full max-w-lg mx-auto min-w-0">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <MissionStrip />
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}
      <p className="text-sm text-[var(--text-secondary)]">{t("standaloneHint")}</p>

      <Card className="space-y-4">
        <SellMembershipPanel
          branchId={branchId}
          customerId={initialCustomerId}
          customerName={initialName}
          phone={initialPhone}
          variant="standalone"
          onError={setError}
          onActivated={(sub) => {
            setSuccess(
              t("soldSuccess", {
                card: sub.cardNumber,
                plan: sub.planName || "",
                until: sub.endsOn,
              })
            );
            setError("");
          }}
        />
      </Card>

      <button type="button" onClick={() => router.push("/manager/walk-in")} className={`${btnSecondary} w-full min-h-11`}>
        {t("backToWalkIn")}
      </button>
    </div>
  );
}
