"use client";

import { useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Check } from "lucide-react";
import type { BillingPeriod, SalesLead } from "@/modules/sales/api/salesApi";
import { BILLING_PERIOD_OPTIONS, formatInr } from "@/modules/sales/lib/pricing";
import {
  SKU_BASE_TIERS,
  SKU_ADDONS,
  SEAT_SKU,
  computeSkuQuote,
  defaultSkuSelection,
  isAddonIncluded,
  parseSkuSelection,
  serializeSkuSelection,
  skuBaseTier,
  type SkuSelection,
} from "@/modules/sales/lib/sku-catalog";
import { isTerminalStage } from "@/modules/sales/lib/stage-utils";
import { inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/ui";
import { cn } from "@/lib/utils";

type UpdateLeadPayload = {
  quotedAmount?: number;
  billingPeriod?: BillingPeriod;
  planTier?: string;
  quotedSkuSelection?: string;
};

type SkuLineItemSelectorProps = {
  lead: SalesLead;
  updateLeadMutation: UseMutationResult<unknown, Error, UpdateLeadPayload, unknown>;
};

export function SkuLineItemSelector({ lead, updateLeadMutation }: SkuLineItemSelectorProps) {
  const savedSelection = parseSkuSelection(lead.quotedSkuSelection);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<SkuSelection>(
    () => savedSelection ?? defaultSkuSelection(lead.expectedBranches)
  );

  const startEditing = () => {
    setSelection(savedSelection ?? defaultSkuSelection(lead.expectedBranches));
    setEditing(true);
  };

  const quote = computeSkuQuote(selection);

  const toggleAddon = (addonId: (typeof SKU_ADDONS)[number]["id"]) => {
    setSelection((prev) => ({
      ...prev,
      addons: prev.addons.includes(addonId)
        ? prev.addons.filter((a) => a !== addonId)
        : [...prev.addons, addonId],
    }));
  };

  const apply = () => {
    const tier = skuBaseTier(selection.base);
    updateLeadMutation.mutate(
      {
        planTier: tier.label,
        billingPeriod: selection.billingPeriod,
        quotedSkuSelection: serializeSkuSelection(selection),
        ...(quote.isCustom ? {} : { quotedAmount: quote.periodTotal }),
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
          Product selection
        </p>
        {!isTerminalStage(lead.stage) && !editing && (
          <button type="button" className="text-xs text-[var(--brand-text)] hover:underline" onClick={startEditing}>
            {savedSelection ? "Edit" : "Choose products"}
          </button>
        )}
      </div>

      {!editing && savedSelection ? (
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">
            {skuBaseTier(savedSelection.base).label} · {savedSelection.branches} branch
            {savedSelection.branches === 1 ? "" : "es"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {savedSelection.addons.map((addonId) => {
              const addon = SKU_ADDONS.find((a) => a.id === addonId);
              if (!addon) return null;
              const included = isAddonIncluded(savedSelection.base, addonId);
              return (
                <span
                  key={addonId}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    included
                      ? "bg-[var(--surface-muted)] text-[var(--ink-muted)]"
                      : "bg-[var(--brand-light)] text-[var(--brand-text)]"
                  )}
                >
                  {addon.label}
                </span>
              );
            })}
            {savedSelection.extraSeats > 0 && (
              <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-text)]">
                +{savedSelection.extraSeats} seat{savedSelection.extraSeats === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      ) : !editing ? (
        <p className="text-sm text-[var(--ink-muted)]">No products selected yet.</p>
      ) : null}

      {editing && (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs text-[var(--ink-muted)]">Base platform</p>
            <div className="space-y-1.5">
              {SKU_BASE_TIERS.map((tier) => (
                <label
                  key={tier.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                    selection.base === tier.id
                      ? "border-[var(--brand-ring)] bg-[var(--brand-light)]/40"
                      : "border-[var(--border)]"
                  )}
                >
                  <input
                    type="radio"
                    name="sku-base-tier"
                    className="mt-0.5"
                    checked={selection.base === tier.id}
                    onChange={() => setSelection((prev) => ({ ...prev, base: tier.id }))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{tier.label}</span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--ink-muted)]">
                        {tier.pricePerBranch != null ? `${formatInr(tier.pricePerBranch)}/branch/mo` : "Custom quote"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{tier.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-[var(--ink-muted)]">Branches</p>
              <input
                className={inputClass}
                type="number"
                min={1}
                value={selection.branches}
                onChange={(e) =>
                  setSelection((prev) => ({ ...prev, branches: Math.max(1, Number(e.target.value) || 1) }))
                }
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--ink-muted)]">Billing period</p>
              <select
                className={selectClass}
                value={selection.billingPeriod}
                onChange={(e) =>
                  setSelection((prev) => ({ ...prev, billingPeriod: e.target.value as BillingPeriod }))
                }
              >
                {BILLING_PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-[var(--ink-muted)]">Add-ons</p>
            <div className="space-y-1.5">
              {SKU_ADDONS.map((addon) => {
                const included = isAddonIncluded(selection.base, addon.id);
                const belowMinBranches = !!addon.minBranches && selection.branches < addon.minBranches;
                const disabled = included || belowMinBranches;
                const checked = included || selection.addons.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm",
                      disabled ? "opacity-60" : "cursor-pointer"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleAddon(addon.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{addon.label}</span>
                        <span className="shrink-0 text-xs font-semibold text-[var(--ink-muted)]">
                          {included ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700">
                              <Check className="h-3 w-3" /> Included
                            </span>
                          ) : (
                            `${formatInr(addon.pricePerBranch)}${addon.perBrand ? "/brand/mo" : "/branch/mo"}`
                          )}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                        {belowMinBranches ? `Requires ${addon.minBranches}+ branches` : addon.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-[var(--ink-muted)]">{SEAT_SKU.label}</p>
            <input
              className={inputClass}
              type="number"
              min={0}
              placeholder="0"
              value={selection.extraSeats || ""}
              onChange={(e) =>
                setSelection((prev) => ({ ...prev, extraSeats: Math.max(0, Number(e.target.value) || 0) }))
              }
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Quote</p>
            <dl className="space-y-1 text-sm">
              {quote.lineItems.map((item) => (
                <div key={item.key} className="flex justify-between gap-2">
                  <dt className="min-w-0 truncate text-[var(--ink-muted)]">
                    {item.label} <span className="text-xs">· {item.qtyLabel}</span>
                  </dt>
                  <dd className="shrink-0 tabular-nums">{item.included ? "Included" : formatInr(item.monthlyAmount)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex justify-between gap-2 border-t border-[var(--border)] pt-2 text-sm font-semibold">
              <dt>Monthly subtotal</dt>
              <dd className="tabular-nums">{formatInr(quote.monthlySubtotal)}</dd>
            </div>
            {quote.isCustom ? (
              <p className="mt-2 text-xs text-[var(--ink-muted)]">
                Enterprise is a custom quote — saving the selection here, enter final pricing in Pricing below.
              </p>
            ) : selection.billingPeriod !== "MONTHLY" ? (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {formatInr(quote.periodTotal)} total for the selected billing period
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={updateLeadMutation.isPending} onClick={apply}>
              {quote.isCustom ? "Save selection" : "Apply to quote"}
            </button>
            <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
