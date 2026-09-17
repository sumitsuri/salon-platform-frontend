"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronDown, Sparkles } from "lucide-react";
import { api, type MembershipSubscription } from "@/lib/api";
import { PromoStaffSellerPicker } from "@/components/manager/PromoStaffSellerPicker";
import { cn, formatCurrency } from "@/lib/utils";
import { WalkInMembershipPicker } from "./WalkInMembershipPicker";
import type { StaffItem } from "@/lib/api";

export function WalkInMembershipBillSection({
  customerId,
  membership,
  staff,
  bookingId,
  saving,
  pendingMembershipPlanId,
  pendingMembershipSoldByStaffId,
  onPlanChange,
  onSoldByChange,
}: {
  customerId: string;
  membership: MembershipSubscription | null;
  staff: StaffItem[];
  bookingId: string;
  saving: boolean;
  pendingMembershipPlanId: string;
  pendingMembershipSoldByStaffId: string;
  onPlanChange: (planId: string) => void;
  onSoldByChange: (staffId: string) => void;
}) {
  const t = useTranslations("manager.walkIn");
  const [expanded, setExpanded] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === pendingMembershipPlanId),
    [plans, pendingMembershipPlanId]
  );

  useEffect(() => {
    if (pendingMembershipPlanId && staff.length > 0 && !pendingMembershipSoldByStaffId) {
      setExpanded(true);
    }
  }, [pendingMembershipPlanId, pendingMembershipSoldByStaffId, staff.length]);

  if (membership) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-violet-200/90 bg-violet-50/50 px-3 py-2.5 min-h-11 dark:border-violet-900/50 dark:bg-violet-950/25">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-900 dark:text-violet-200 truncate">
            {membership.planName || t("membershipBillRowLabel")}
          </p>
          <p className="text-[11px] text-violet-800/80 dark:text-violet-300/80 truncate">
            {t("memberCardActiveSubtitle", { percent: membership.benefitPercent ?? 10 })}
          </p>
        </div>
      </div>
    );
  }

  if (!customerId || plans.length === 0) return null;

  const summary = selectedPlan
    ? t("membershipCollapsedSelected", {
        name: selectedPlan.name,
        amount: formatCurrency(selectedPlan.feeAmount),
      })
    : t("membershipCollapsedNone");

  return (
    <div className="rounded-xl border border-violet-200/90 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 min-h-11 touch-manipulation text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t("membershipBillRowLabel")}</p>
          <p className="text-[11px] text-[var(--text-secondary)] truncate">{summary}</p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-violet-200/70 px-3 py-3 dark:border-violet-900/40">
          {staff.length > 0 ? (
            <PromoStaffSellerPicker
              staff={staff}
              value={pendingMembershipSoldByStaffId}
              onChange={onSoldByChange}
              disabled={!bookingId || saving}
              kind="membership"
              compact
            />
          ) : null}
          <WalkInMembershipPicker
            value={pendingMembershipPlanId}
            onChange={onPlanChange}
            disabled={!bookingId || saving || (staff.length > 0 && !pendingMembershipSoldByStaffId)}
            hideHeader
          />
        </div>
      ) : null}
    </div>
  );
}
