"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { CustomerPackageSubscription, BranchServiceItem } from "@/lib/api";
import { isValueCreditSubscription } from "@/lib/package-subscription-utils";
import { btnSecondarySm } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";

type Props = {
  subscriptions: CustomerPackageSubscription[];
  servicesById: Map<string, BranchServiceItem>;
  packageQtyInCart: (subscriptionId: string, branchServiceId: string) => number;
  onRedeem: (
    branchServiceId: string,
    serviceName: string,
    basePrice: number,
    subscriptionId: string,
    quantity: number
  ) => void;
  disabled?: boolean;
};

export function WalkInCustomerPackagesPanel({
  subscriptions,
  servicesById,
  packageQtyInCart,
  onRedeem,
  disabled,
}: Props) {
  const t = useTranslations("manager.walkIn");
  if (subscriptions.length === 0) return null;

  const serviceToBranch = new Map<string, string>();
  servicesById.forEach((svc, branchServiceId) => {
    serviceToBranch.set(svc.serviceId, branchServiceId);
  });

  const bundleSubs = subscriptions.filter((s) => !isValueCreditSubscription(s));
  const valueSubs = subscriptions.filter((s) => isValueCreditSubscription(s));

  return (
    <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-2.5 py-2 dark:border-sky-900/40 dark:bg-sky-950/25">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Gift className="h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <span className="text-[11px] font-semibold tracking-tight text-sky-950 dark:text-sky-100">
          {t("customerPackagesTitle")}
        </span>
      </div>

      {valueSubs.length > 0 ? (
        <ul className="space-y-1.5">
          {valueSubs.map((sub) => {
            const creditRemaining = sub.creditRemaining ?? 0;
            const exhausted = creditRemaining <= 0;
            return (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)]/50 bg-[var(--surface)] px-2.5 py-2 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{sub.planName}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                    {t("packageExpiresShort", { date: sub.expiresOn })}
                    {!exhausted ? (
                      <span className="text-[var(--text-secondary)]"> · {t("valuePackageAutoApplyHint")}</span>
                    ) : null}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    exhausted
                      ? "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
                      : "bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100"
                  )}
                >
                  {exhausted ? t("packageCreditExhausted") : formatCurrency(creditRemaining)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {bundleSubs.length > 0 ? (
        <ul className={cn("space-y-2 text-xs", valueSubs.length > 0 && "mt-2 border-t border-sky-200/60 pt-2 dark:border-sky-900/40")}>
          {bundleSubs.map((sub) => (
            <li key={sub.id} className="rounded-md border border-[var(--border)]/60 bg-[var(--surface)]/90 p-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate font-semibold text-[var(--text-primary)]">{sub.planName}</p>
                <p className="shrink-0 text-[10px] text-[var(--text-tertiary)]">{t("packageExpiresShort", { date: sub.expiresOn })}</p>
              </div>
              <ul className="mt-1.5 space-y-1">
                {sub.entitlements.map((ent) => {
                  const branchServiceId = serviceToBranch.get(ent.serviceId);
                  const inCart = branchServiceId ? packageQtyInCart(sub.id, branchServiceId) : 0;
                  const available = ent.quantityRemaining - inCart;
                  const exhausted = available <= 0;
                  const usedOnPlan = ent.quantityTotal - ent.quantityRemaining;
                  return (
                    <li
                      key={ent.id}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-0.5",
                        exhausted && "opacity-60"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--text-primary)]" title={ent.serviceName}>
                          {ent.serviceName}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-[var(--text-secondary)]">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-1.5 py-px font-semibold tabular-nums",
                              exhausted
                                ? "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
                                : "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                            )}
                          >
                            {exhausted
                              ? t("packageEntitlementAllUsed")
                              : t("packageEntitlementRemaining", {
                                  remaining: available,
                                  total: ent.quantityTotal,
                                })}
                          </span>
                          {usedOnPlan > 0 && !exhausted ? (
                            <span className="text-[var(--text-tertiary)]">
                              {t("packageEntitlementUsedCount", { count: usedOnPlan })}
                            </span>
                          ) : null}
                          {inCart > 0 ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {t("packageInVisitCart", { count: inCart })}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {branchServiceId && !exhausted ? (
                        <PackageRedeemControls
                          key={`${sub.id}-${ent.id}-${available}`}
                          disabled={disabled}
                          maxQty={available}
                          onRedeem={(qty) => {
                            const svc = servicesById.get(branchServiceId);
                            onRedeem(branchServiceId, ent.serviceName, svc?.price ?? 0, sub.id, qty);
                          }}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PackageRedeemControls({
  disabled,
  maxQty,
  onRedeem,
}: {
  disabled?: boolean;
  maxQty: number;
  onRedeem: (qty: number) => void;
}) {
  const t = useTranslations("manager.walkIn");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty((prev) => Math.min(Math.max(1, prev), Math.max(1, maxQty)));
  }, [maxQty]);

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={maxQty}
        value={qty}
        onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
        className="w-10 rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-center text-[11px] tabular-nums"
        disabled={disabled}
        aria-label={t("packageRedeemQty")}
      />
      <button
        type="button"
        className={btnSecondarySm}
        disabled={disabled || maxQty <= 0}
        onClick={() => onRedeem(qty)}
      >
        {t("packageRedeemAdd")}
      </button>
    </div>
  );
}
