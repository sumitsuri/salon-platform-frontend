"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ServicePackagePlan } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { selectClass } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";

function planOptionLabel(plan: ServicePackagePlan) {
  const mode = plan.redemptionMode === "SINGLE_VISIT" ? "1 visit" : "multi-visit";
  return `${plan.name} · ${formatCurrency(plan.packagePrice)} · ${plan.validityDays}d · ${mode}`;
}

function activePlansForBranch(plans: ServicePackagePlan[], branchId: string) {
  return plans.filter(
    (p) =>
      p.status === "ACTIVE" &&
      (!p.branchIds?.length || p.branchIds.includes(branchId))
  );
}

export function WalkInPackagePicker({
  value,
  onChange,
  disabled,
  onConflictClearMembership,
}: {
  value: string;
  onChange: (planId: string) => void;
  disabled?: boolean;
  onConflictClearMembership?: () => void;
}) {
  const t = useTranslations("manager.walkIn");
  const branchId = useAuthStore((s) => s.user?.branchId) || "";

  const { data: activePlans = [], isLoading: loadingActive, isError: activeError } = useQuery({
    queryKey: ["active-package-plans", branchId],
    queryFn: () => api.getActivePackagePlans(branchId),
    enabled: !!branchId,
  });

  const { data: allPlans = [], isLoading: loadingAll } = useQuery({
    queryKey: ["package-plans-fallback", branchId],
    queryFn: () => api.getPackagePlans(false),
    enabled: !!branchId && !loadingActive && activePlans.length === 0,
  });

  const plans = useMemo(() => {
    if (activePlans.length > 0) {
      return activePlans;
    }
    return activePlansForBranch(allPlans, branchId);
  }, [activePlans, allPlans, branchId]);

  const selectedPlan = useMemo(() => plans.find((p) => p.id === value), [plans, value]);
  const loading = loadingActive || (activePlans.length === 0 && loadingAll);

  if (!branchId) {
    return (
      <p className="text-xs text-amber-800 dark:text-amber-200">{t("packagePickerNoBranch")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{t("packageBillRowLabel")}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
          {selectedPlan
            ? t("packageBillRowSelected", { amount: formatCurrency(selectedPlan.packagePrice) })
            : t("packageBillRowNone")}
        </p>
      </div>
      {loading ? (
        <p className="text-xs text-[var(--text-tertiary)] shrink-0">{t("packagePickerLoading")}</p>
      ) : plans.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] shrink-0">
          {activeError ? t("packagePickerError") : t("packagePickerEmpty")}
        </p>
      ) : (
        <>
          <select
            value={value}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value && onConflictClearMembership) {
                onConflictClearMembership();
              }
              onChange(e.target.value);
            }}
            aria-label={t("packageBillRowLabel")}
            className={cn(selectClass, "w-full sm:w-auto sm:min-w-[min(100%,18rem)] min-h-11 shrink-0")}
          >
            <option value="">{t("packageNone")}</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.predefinedRank ? `#${plan.predefinedRank} · ` : ""}
                {planOptionLabel(plan)}
              </option>
            ))}
          </select>
          {selectedPlan?.items?.length ? (
            <p className="text-[11px] text-[var(--text-secondary)] sm:col-span-2">
              {t("packageIncludes")}{" "}
              {selectedPlan.items.map((i) => `${i.serviceName || "Service"}×${i.quantity}`).join(", ")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
