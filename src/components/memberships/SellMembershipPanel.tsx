"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard, Sparkles } from "lucide-react";
import { api, MembershipPlan, MembershipSubscription } from "@/lib/api";
import { bumpLookupGeneration, isLookupGenerationStale } from "@/lib/customer-lookup-session";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { cn, formatCurrency } from "@/lib/utils";
import { PromoStaffSellerPicker } from "@/components/manager/PromoStaffSellerPicker";
import { SegmentedControl, inputClass, btnPrimary, btnSecondary, Callout } from "@/components/ui";

type PaymentMode = "CASH" | "UPI" | "CARD";
type LookupStatus = "idle" | "loading" | "found" | "not_found";

export type SellMembershipPanelProps = {
  branchId: string;
  customerId?: string;
  customerName?: string;
  phone?: string;
  variant?: "standalone" | "embed";
  onCustomerResolved?: (customer: { id: string; name: string; phone: string }) => void;
  onActivated: (subscription: MembershipSubscription) => void;
  onError?: (message: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
};

function planMonths(plan: MembershipPlan) {
  return plan.cadence === "MONTHS_12" ? 12 : 6;
}

export function SellMembershipPanel({
  branchId,
  customerId: customerIdProp = "",
  customerName: customerNameProp = "",
  phone: phoneProp = "",
  variant = "standalone",
  onCustomerResolved,
  onActivated,
  onError,
  onSkip,
  showSkip = false,
}: SellMembershipPanelProps) {
  const t = useTranslations("manager.memberships");
  const tWalkIn = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");

  const embed = variant === "embed";
  const [phone, setPhone] = useState(phoneProp);
  const [customerId, setCustomerId] = useState(customerIdProp);
  const [customerName, setCustomerName] = useState(customerNameProp);
  const [newGuestName, setNewGuestName] = useState("");
  const [planId, setPlanId] = useState("");
  const [soldByStaffId, setSoldByStaffId] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [reference, setReference] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>(customerIdProp ? "found" : "idle");
  const lookupPhoneRef = useRef(customerIdProp ? normalizeIndianMobile(phoneProp) || phoneProp : "");
  const phoneLookupGenerationRef = useRef(0);
  const lookupStatusRef = useRef<LookupStatus>(lookupStatus);
  lookupStatusRef.current = lookupStatus;

  useEffect(() => {
    setPhone(phoneProp);
  }, [phoneProp]);

  useEffect(() => {
    if (customerIdProp) {
      setCustomerId(customerIdProp);
      setCustomerName(customerNameProp);
      lookupPhoneRef.current = normalizeIndianMobile(phoneProp) || phoneProp;
      setLookupStatus("found");
    }
  }, [customerIdProp, customerNameProp, phoneProp]);

  const { data: branchStaff = [] } = useQuery({
    queryKey: ["branch-staff-sell-membership", branchId],
    queryFn: () => api.getStaff(branchId),
    enabled: Boolean(branchId),
  });

  const activeStaff = branchStaff;

  useEffect(() => {
    if (soldByStaffId || activeStaff.length === 0) return;
    setSoldByStaffId(activeStaff[0].id);
  }, [activeStaff, soldByStaffId]);

  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const { data: activeMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ["active-membership-customer", customerId],
    queryFn: () => api.getActiveMembership(customerId),
    enabled: Boolean(customerId),
  });

  const isAlreadyMember = Boolean(activeMembership?.cardNumber);

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const needsReference = paymentMode !== "CASH";

  const runPhoneLookup = useCallback(
    (rawPhone: string) => {
      if (embed || customerIdProp) return;

      const normalized = normalizeIndianMobile(rawPhone);
      if (!normalized || !isValidIndianMobile(rawPhone)) {
        setLookupStatus("idle");
        setCustomerId("");
        setCustomerName("");
        return;
      }
      if (lookupPhoneRef.current === normalized && lookupStatusRef.current !== "idle" && lookupStatusRef.current !== "loading") {
        return;
      }

      lookupPhoneRef.current = normalized;
      const generationAtStart = phoneLookupGenerationRef.current;
      setLookupStatus("loading");
      onError?.("");

      void api
        .findCustomerByPhone(normalized, branchId)
        .then((c) => {
          if (isLookupGenerationStale(phoneLookupGenerationRef, generationAtStart)) return;
          if (lookupPhoneRef.current !== normalized) return;
          setCustomerId(c.id);
          setCustomerName(c.name);
          setNewGuestName(c.name);
          setLookupStatus("found");
          onCustomerResolved?.({ id: c.id, name: c.name, phone: normalized });
        })
        .catch(() => {
          if (isLookupGenerationStale(phoneLookupGenerationRef, generationAtStart)) return;
          if (lookupPhoneRef.current !== normalized) return;
          setCustomerId("");
          setCustomerName("");
          setLookupStatus("not_found");
        });
    },
    [embed, customerIdProp, branchId, onCustomerResolved, onError]
  );

  useEffect(() => {
    runPhoneLookup(phone);
  }, [phone, runPhoneLookup]);

  const registerGuest = useMutation({
    mutationFn: async () => {
      const normalized = normalizeIndianMobile(phone);
      if (!normalized || !newGuestName.trim()) {
        throw new Error(tWalkIn("nameRequired"));
      }
      return api.createCustomer({
        name: newGuestName.trim(),
        phone: normalized,
        branchId,
      });
    },
    onSuccess: (c) => {
      const normalized = normalizeIndianMobile(phone) || phone;
      setCustomerId(c.id);
      setCustomerName(c.name);
      setLookupStatus("found");
      onCustomerResolved?.({ id: c.id, name: c.name, phone: normalized });
      onError?.("");
    },
    onError: (e: Error) => onError?.(e.message),
  });

  const sell = useMutation({
    mutationFn: () => {
      if (!customerId || !planId || !branchId || !soldByStaffId) {
        throw new Error(t("assignSeller"));
      }
      if (needsReference && !reference.trim()) {
        throw new Error(t("txnReference"));
      }
      return api.sellMembership({
        customerId,
        planId,
        branchId,
        soldByStaffId,
        paymentMode,
        paymentReference: reference.trim() || undefined,
      });
    },
    onSuccess: (sub) => {
      onActivated(sub);
      onError?.("");
    },
    onError: (e: Error) => onError?.(e.message),
  });

  const canSell =
    Boolean(customerId && planId && branchId && soldByStaffId) &&
    !isAlreadyMember &&
    (!needsReference || reference.trim().length > 0) &&
    !sell.isPending;

  const customerReady = Boolean(customerId);
  const phoneValid = isValidIndianMobile(phone);
  const showSellForm = customerReady && !membershipLoading && !isAlreadyMember && plans.length > 0;

  return (
    <div
      className={cn(
        "space-y-3",
        embed &&
          "rounded-2xl border border-[var(--brand)]/30 bg-gradient-to-br from-[var(--brand-light)]/80 to-[var(--surface)] p-4 shadow-sm"
      )}
    >
      {embed ? (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--brand-on-brand)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[var(--text-primary)]">{tWalkIn("membershipOfferTitle")}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{tWalkIn("membershipOfferSubtitle")}</p>
          </div>
        </div>
      ) : null}

      {!embed && (
        <div
          className="rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/95 to-[var(--brand-light)]/40 px-3 py-2.5 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-indigo-950/20 manager-home-incentive-cta--membership animate-pulse-subtle"
          role="note"
        >
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{t("incentiveBannerTitle")}</p>
          <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90 mt-0.5">{t("incentiveBannerBody")}</p>
        </div>
      )}

      {!embed && (
        <div className="space-y-2">
          <input
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => {
              const next = e.target.value;
              bumpLookupGeneration(phoneLookupGenerationRef);
              setPhone(next);
              setCustomerId("");
              setCustomerName("");
              setNewGuestName("");
              setPlanId("");
              lookupPhoneRef.current = "";
              setLookupStatus("idle");
              onError?.("");
            }}
            className={inputClass}
            inputMode="tel"
            autoComplete="tel"
          />
          {lookupStatus === "loading" && (
            <p className="text-xs text-[var(--text-tertiary)]">{tCommon("loading")}</p>
          )}
          {phone.length > 0 && !phoneValid && lookupStatus !== "loading" && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{tWalkIn("phoneInvalid")}</p>
          )}
        </div>
      )}

      {!embed && lookupStatus === "not_found" && phoneValid && (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t("newGuestTitle")}</p>
          <p className="text-xs text-[var(--text-secondary)]">{t("newGuestHint")}</p>
          <input
            placeholder={tWalkIn("namePlaceholder")}
            value={newGuestName}
            onChange={(e) => setNewGuestName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />
          <button
            type="button"
            disabled={!newGuestName.trim() || registerGuest.isPending}
            onClick={() => registerGuest.mutate()}
            className={cn(btnPrimary, "w-full min-h-11")}
          >
            {registerGuest.isPending ? tCommon("processing") : t("registerAndContinue")}
          </button>
        </div>
      )}

      {embed && customerReady && (
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {customerName} · {phone}
        </p>
      )}

      {!embed && customerReady && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 px-3 py-2.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{customerName}</p>
          <p className="text-xs text-[var(--text-secondary)]">{phone}</p>
        </div>
      )}

      {customerReady && !membershipLoading && !isAlreadyMember && activeStaff.length > 0 && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-3 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/25">
          <PromoStaffSellerPicker
            staff={activeStaff}
            value={soldByStaffId}
            onChange={setSoldByStaffId}
            disabled={sell.isPending}
            kind="membership"
          />
        </div>
      )}

      {customerReady && membershipLoading && (
        <p className="text-xs text-[var(--text-tertiary)]">{t("checkingMembership")}</p>
      )}

      {customerReady && !membershipLoading && isAlreadyMember && activeMembership && (
        <Callout
          variant="success"
          icon={<CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />}
          title={t("alreadyMemberTitle", { name: customerName })}
        >
          <p className="text-sm text-[var(--text-secondary)]">
            {t("alreadyMemberDetail", {
              plan: activeMembership.planName || "Member",
              card: activeMembership.cardNumber,
              until: activeMembership.endsOn,
              percent: activeMembership.benefitPercent ?? 10,
            })}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("alreadyMemberHint")}</p>
        </Callout>
      )}

      {customerReady && !membershipLoading && !isAlreadyMember && (
        <Callout variant="info" title={t("notMemberYetTitle", { name: customerName })}>
          <p className="text-sm text-[var(--text-secondary)]">{t("notMemberYetHint")}</p>
        </Callout>
      )}

      {showSellForm && (
        <>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
            {plans.map((plan) => {
              const active = planId === plan.id;
              const months = planMonths(plan);
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setPlanId(plan.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition touch-manipulation min-h-[5.5rem]",
                    active
                      ? "border-[var(--brand)] bg-[var(--surface)] shadow-sm ring-2 ring-[var(--brand-ring)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{plan.name}</p>
                    {active && <CreditCard className="h-4 w-4 shrink-0 text-[var(--brand-text)]" />}
                  </div>
                  <p className="text-xl font-bold tabular-nums text-[var(--text-primary)] mt-1">
                    {formatCurrency(plan.feeAmount)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {t("planSummary", {
                      fee: formatCurrency(plan.feeAmount),
                      percent: plan.benefitPercent,
                      months,
                    })}
                  </p>
                </button>
              );
            })}
          </div>

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
              onChange={(m) => setPaymentMode(m as PaymentMode)}
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
            className={cn(btnPrimary, "w-full min-h-12")}
          >
            {sell.isPending
              ? tCommon("processing")
              : selectedPlan
                ? tWalkIn("membershipActivateAmount", { amount: formatCurrency(selectedPlan.feeAmount) })
                : t("sell")}
          </button>

          {showSkip && onSkip && (
            <button type="button" onClick={onSkip} className={cn(btnSecondary, "w-full min-h-11")}>
              {tWalkIn("membershipSkip")}
            </button>
          )}
        </>
      )}

      {customerReady && !membershipLoading && !isAlreadyMember && plans.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">{t("noPlans")}</p>
      )}
    </div>
  );
}
