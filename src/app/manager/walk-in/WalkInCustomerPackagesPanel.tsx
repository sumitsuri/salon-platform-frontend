"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { CustomerPackageSubscription, BranchServiceItem } from "@/lib/api";
import { btnSecondarySm } from "@/components/ui";
import { cn } from "@/lib/utils";

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

  return (
    <div className="rounded-lg border border-sky-200/90 bg-sky-50/40 px-3 py-2 dark:border-sky-900/50 dark:bg-sky-950/20">
      <div className="mb-2 flex items-center gap-1.5">
        <Gift className="h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <span className="text-[11px] font-semibold text-sky-900 dark:text-sky-200">{t("customerPackagesTitle")}</span>
      </div>
      <ul className="space-y-2 text-xs">
        {subscriptions.map((sub) => (
          <li key={sub.id} className="rounded-md border border-[var(--border)]/60 bg-[var(--surface)]/80 p-2">
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
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-md border border-transparent py-1 pl-1 pr-0.5",
                      exhausted && "opacity-60"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]" title={ent.serviceName}>
                        {ent.serviceName}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] text-[var(--text-secondary)]">
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
    </div>
  );
}

function PackageRedeemControls({
  maxQty,
  onRedeem,
  disabled,
}: {
  maxQty: number;
  onRedeem: (quantity: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("manager.walkIn");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty((prev) => Math.min(Math.max(1, prev), maxQty));
  }, [maxQty]);

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-1">
      <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <button
          type="button"
          disabled={disabled || qty <= 1}
          className="px-1.5 py-1 text-sm font-medium disabled:opacity-40 touch-manipulation"
          aria-label={t("packageRedeemQtyDecrease")}
          onClick={() => setQty((n) => Math.max(1, n - 1))}
        >
          −
        </button>
        <span className="min-w-[1.25rem] px-0.5 text-center tabular-nums text-[11px] font-bold">{qty}</span>
        <button
          type="button"
          disabled={disabled || qty >= maxQty}
          className="px-1.5 py-1 text-sm font-medium disabled:opacity-40 touch-manipulation"
          aria-label={t("packageRedeemQtyIncrease")}
          onClick={() => setQty((n) => Math.min(maxQty, n + 1))}
        >
          +
        </button>
      </div>
      <button
        type="button"
        disabled={disabled || maxQty < 1}
        className={cn(btnSecondarySm, "whitespace-nowrap px-2.5 py-1 text-[11px]")}
        onClick={() => onRedeem(qty)}
      >
        {t("redeemPackageService")}
      </button>
    </div>
  );
}
