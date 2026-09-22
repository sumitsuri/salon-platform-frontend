"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, MessageCircle, PartyPopper, Sparkles, TrendingUp } from "lucide-react";
import { salesApi } from "@/modules/sales/api/salesApi";
import { formatInr } from "@/modules/sales/lib/pricing";
import {
  SKU_BASE_TIERS,
  SKU_CATEGORIES,
  computeSkuQuote,
  defaultSkuSelection,
  isAddonIncluded,
  isCategorySelected,
  serializeSkuSelection,
  skuAddon,
  skuBaseTier,
  suggestGrowthUpgrade,
  toggleCategory,
  toggleSkuAddon,
  type SkuCategoryId,
  type SkuSelection,
} from "@/modules/sales/lib/sku-catalog";
import { salesLeadDetailHref } from "@/modules/sales/lib/lead-routes";
import { invalidateSalesLeadLists } from "@/modules/sales/lib/query-keys";
import { SideSheet, btnPrimary, btnSecondary } from "@/components/ui";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<SkuCategoryId, typeof MessageCircle> = {
  GUEST_EXPERIENCE: MessageCircle,
  LOCAL_GROWTH: TrendingUp,
  MULTI_BRANCH: Building2,
};

export type ClaimedLeadSummary = {
  id: string;
  businessName: string;
  expectedBranches: number;
};

type ClaimQuoteSheetProps = {
  lead: ClaimedLeadSummary | null;
  onClose: () => void;
};

/**
 * Fires right after a rep claims a salon from the map. Claiming itself is already committed
 * (fast, uncontested) — this is an optional, skippable follow-up so product interest and a
 * live price get attached to the lead while the pitch is still fresh, instead of being filled
 * in later on the detail page.
 */
export function ClaimQuoteSheet({ lead, onClose }: ClaimQuoteSheetProps) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<SkuSelection>(() => defaultSkuSelection(lead?.expectedBranches ?? 1));
  const [leadIdForSelection, setLeadIdForSelection] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<SkuCategoryId>>(new Set());

  // Reset the draft selection when a new lead is claimed — adjust during render, not in an effect.
  if (lead && lead.id !== leadIdForSelection) {
    setLeadIdForSelection(lead.id);
    setSelection(defaultSkuSelection(lead.expectedBranches));
    setSaved(false);
  }

  const toggleExpanded = (categoryId: SkuCategoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const quote = computeSkuQuote(selection);
  const growthSuggestion = suggestGrowthUpgrade(selection);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!lead) throw new Error("No claimed lead");
      const tier = skuBaseTier(selection.base);
      return salesApi.updateLead(lead.id, {
        planTier: tier.label,
        billingPeriod: selection.billingPeriod,
        quotedSkuSelection: serializeSkuSelection(selection),
        ...(quote.isCustom ? {} : { quotedAmount: quote.periodTotal }),
      });
    },
    onSuccess: async () => {
      setSaved(true);
      await invalidateSalesLeadLists(queryClient);
    },
  });

  const handleClose = () => {
    onClose();
    saveMutation.reset();
  };

  return (
    <SideSheet
      open={!!lead}
      onClose={handleClose}
      title="Claimed! What do they need?"
      subtitle={lead?.businessName}
    >
      {!lead ? null : saved ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <PartyPopper className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold">Product interest saved</p>
          <p className="text-sm text-[var(--ink-muted)]">
            {skuBaseTier(selection.base).label} · {formatInr(quote.monthlySubtotal)}/mo — ready to pitch.
          </p>
          <div className="mt-2 flex gap-2">
            <Link href={salesLeadDetailHref(lead.id)} className={btnPrimary}>
              Open lead
            </Link>
            <button type="button" className={btnSecondary} onClick={handleClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink-muted)]">
            Tap what they&apos;re missing today — this is optional and takes 5 seconds. You can always refine
            it later from the lead.
          </p>

          <div className="space-y-2">
            {SKU_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.id];
              const active = isCategorySelected(selection, category);
              const expanded = expandedCategories.has(category.id);
              return (
                <div
                  key={category.id}
                  className={cn(
                    "overflow-hidden rounded-xl border transition",
                    active
                      ? "border-[var(--brand-ring)] bg-[var(--brand-light)]/50"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelection((prev) => toggleCategory(prev, category))}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left touch-manipulation"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          active
                            ? "bg-[var(--brand)] text-[var(--brand-on-brand)]"
                            : "bg-[var(--surface-muted)] text-[var(--ink-muted)]"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{category.label}</span>
                        <span className="block text-xs text-[var(--ink-muted)]">{category.pitch}</span>
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                          active
                            ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-on-brand)]"
                            : "border-[var(--border)] text-transparent"
                        )}
                      >
                        ✓
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(category.id)}
                      aria-label={expanded ? `Hide ${category.label} products` : `Show ${category.label} products`}
                      aria-expanded={expanded}
                      className="flex h-9 w-9 shrink-0 items-center justify-center self-stretch text-[var(--ink-muted)] touch-manipulation"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </div>

                  {expanded && (
                    <div className="space-y-1 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                      {category.addons.map((addonId) => {
                        const addon = skuAddon(addonId);
                        const included = isAddonIncluded(selection.base, addonId);
                        const belowMinBranches = !!addon.minBranches && selection.branches < addon.minBranches;
                        const disabled = included || belowMinBranches;
                        const checked = included || selection.addons.includes(addonId);
                        return (
                          <label
                            key={addonId}
                            className={cn(
                              "flex items-start gap-2 rounded-lg px-2 py-2 text-xs",
                              disabled ? "opacity-60" : "cursor-pointer touch-manipulation"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => setSelection((prev) => toggleSkuAddon(prev, addonId))}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="font-medium">{addon.label}</span>
                                <span className="shrink-0 font-semibold text-[var(--ink-muted)]">
                                  {included ? (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                      <Check className="h-3 w-3" /> Included
                                    </span>
                                  ) : (
                                    `${formatInr(addon.pricePerBranch)}${addon.perBrand ? "/brand/mo" : "/branch/mo"}`
                                  )}
                                </span>
                              </span>
                              {belowMinBranches && (
                                <span className="block text-[var(--ink-muted)]">
                                  Requires {addon.minBranches}+ branches
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {growthSuggestion && (
            <button
              type="button"
              onClick={() => setSelection((prev) => ({ ...prev, base: "GROWTH" }))}
              className="flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs font-medium text-amber-900 touch-manipulation"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
              Switch to Growth — save {formatInr(growthSuggestion.monthlySavings)}/mo vs. these add-ons on Starter
            </button>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                  {skuBaseTier(selection.base).label} plan
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {quote.isCustom ? "Custom quote" : `${formatInr(quote.monthlySubtotal)}/mo`}
                </p>
              </div>
              <div className="flex gap-1">
                {SKU_BASE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelection((prev) => ({ ...prev, base: tier.id }))}
                    className={cn(
                      "rounded-full px-2.5 py-1.5 text-[11px] font-semibold touch-manipulation",
                      selection.base === tier.id
                        ? "bg-[var(--brand)] text-[var(--brand-on-brand)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                    )}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className={btnPrimary}
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save product interest"}
            </button>
            <button type="button" className={btnSecondary} onClick={handleClose}>
              Skip for now
            </button>
          </div>
        </div>
      )}
    </SideSheet>
  );
}
