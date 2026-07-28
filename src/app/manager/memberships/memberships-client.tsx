"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/utils";
import {
  PageHeader,
  Card,
  AlertBanner,
  SegmentedControl,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

export default function ManagerMembershipsPage() {
  const t = useTranslations("manager.memberships");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const router = useRouter();
  const params = useSearchParams();

  const [phone, setPhone] = useState(params.get("phone") || "");
  const [customerId, setCustomerId] = useState(params.get("customerId") || "");
  const [customerName, setCustomerName] = useState(params.get("name") || "");
  const [planId, setPlanId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  const needsReference = paymentMode !== "CASH";
  const canSearch = phone.trim().length >= 8;

  async function searchCustomer() {
    setError("");
    setSuccess("");
    if (!canSearch) {
      setError(t("customerNotFound"));
      return;
    }
    try {
      const c = await api.findCustomerByPhone(phone.trim());
      setCustomerId(c.id);
      setCustomerName(c.name);
    } catch {
      setError(t("customerNotFound"));
      setCustomerId("");
      setCustomerName("");
    }
  }

  const sell = useMutation({
    mutationFn: () => {
      if (!customerId || !planId || !branchId) {
        throw new Error(t("customerNotFound"));
      }
      if (needsReference && !reference.trim()) {
        throw new Error(t("txnReference"));
      }
      return api.sellMembership({
        customerId,
        planId,
        branchId,
        paymentMode,
        paymentReference: reference.trim() || undefined,
      });
    },
    onSuccess: (sub) => {
      setSuccess(
        t("soldSuccess", {
          card: sub.cardNumber,
          plan: sub.planName || "",
          until: sub.endsOn,
        })
      );
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSell =
    Boolean(customerId && planId && branchId) &&
    (!needsReference || reference.trim().length > 0) &&
    !sell.isPending;

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <MissionStrip />
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              // Stale customer must not remain sellable after phone edits.
              if (customerId) {
                setCustomerId("");
                setCustomerName("");
              }
              setSuccess("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchCustomer();
              }
            }}
            className={inputClass}
            inputMode="tel"
            autoComplete="tel"
          />
          <button
            type="button"
            onClick={() => void searchCustomer()}
            disabled={!canSearch}
            className={`${btnSecondary} disabled:opacity-50 disabled:pointer-events-none`}
          >
            {tCommon("search")}
          </button>
        </div>
        {customerId && (
          <p className="text-sm text-[var(--text-secondary)]">
            {customerName} · {phone}
          </p>
        )}

        <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={selectClass}>
          <option value="">{t("selectPlan")}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.cadence === "MONTHS_12" ? "12 mo" : "6 mo"} · {formatCurrency(p.feeAmount)} ·{" "}
              {p.benefitPercent}% off
            </option>
          ))}
        </select>

        {selectedPlan && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm flex items-start gap-2">
            <CreditCard className="w-4 h-4 mt-0.5 text-[var(--brand)]" />
            <div>
              <p className="font-semibold">{selectedPlan.name}</p>
              <p className="text-[var(--text-secondary)]">
                {t("planSummary", {
                  fee: formatCurrency(selectedPlan.feeAmount),
                  percent: selectedPlan.benefitPercent,
                  months: selectedPlan.cadence === "MONTHS_12" ? 12 : 6,
                })}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            {t("paymentMode")}
          </p>
          <SegmentedControl
            options={[
              { id: "CASH", label: tCommon("cash") },
              { id: "UPI", label: tCommon("upi") },
              { id: "CARD", label: tCommon("card") },
            ]}
            value={paymentMode}
            onChange={(m) => setPaymentMode(m as "CASH" | "UPI" | "CARD")}
          />
        </div>

        {needsReference && (
          <input
            placeholder={t("txnReference")}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputClass}
          />
        )}

        <button
          type="button"
          onClick={() => sell.mutate()}
          disabled={!canSell}
          aria-disabled={!canSell}
          className={`${btnPrimary} w-full`}
        >
          {sell.isPending ? tCommon("processing") : t("sell")}
        </button>

        <button
          type="button"
          onClick={() => router.push("/manager/walk-in")}
          className={`${btnSecondary} w-full`}
        >
          {t("backToWalkIn")}
        </button>
      </Card>
    </div>
  );
}
