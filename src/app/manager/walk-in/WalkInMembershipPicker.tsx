"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, MembershipPlan } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { selectClass } from "@/components/ui";

function planMonths(plan: MembershipPlan) {
  return plan.cadence === "MONTHS_12" ? 12 : 6;
}

function planOptionLabel(plan: MembershipPlan) {
  return `${plan.name} · ${formatCurrency(plan.feeAmount)} · ${plan.benefitPercent}% · ${planMonths(plan)} mo`;
}

export function WalkInMembershipPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (planId: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("manager.walkIn");
  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const selectedPlan = useMemo(() => plans.find((p) => p.id === value), [plans, value]);

  if (plans.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{t("membershipBillRowLabel")}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
          {selectedPlan
            ? t("membershipBillRowSelected", {
                amount: formatCurrency(selectedPlan.feeAmount),
                percent: selectedPlan.benefitPercent,
              })
            : t("membershipBillRowNone")}
        </p>
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("membershipBillRowLabel")}
        className={cn(selectClass, "w-full sm:w-auto sm:min-w-[min(100%,18rem)] min-h-11 shrink-0")}
      >
        <option value="">{t("membershipNone")}</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {planOptionLabel(plan)}
          </option>
        ))}
      </select>
    </div>
  );
}
