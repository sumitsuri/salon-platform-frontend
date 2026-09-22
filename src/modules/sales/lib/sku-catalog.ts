import { BillingPeriod } from "@/modules/sales/api/salesApi";
import { monthsInPeriod } from "@/modules/sales/lib/pricing";

export type SkuBaseTier = "STARTER" | "GROWTH" | "ENTERPRISE";
export type SkuAddonId = "WHATSAPP" | "MARKET_PULSE" | "LOCAL_SPOTLIGHT" | "CUSTOMER_VOICE" | "BRAND_PL";

export interface SkuBaseDefinition {
  id: SkuBaseTier;
  label: string;
  /** ₹/branch/month. Null = custom quote (Enterprise) — not auto-computable. */
  pricePerBranch: number | null;
  description: string;
  /** Add-ons already bundled at this tier — shown as "Included", not sold separately. */
  includes: SkuAddonId[];
}

export interface SkuAddonDefinition {
  id: SkuAddonId;
  label: string;
  /** ₹/month — per branch unless perBrand is set. */
  pricePerBranch: number;
  perBrand?: boolean;
  minBranches?: number;
  description: string;
}

export const SKU_BASE_TIERS: SkuBaseDefinition[] = [
  {
    id: "STARTER",
    label: "Starter",
    pricePerBranch: 2999,
    description: "Walk-in GST billing, 1 manager seat, bookings & basic reports, attendance essentials.",
    includes: [],
  },
  {
    id: "GROWTH",
    label: "Growth",
    pricePerBranch: 4999,
    description: "Everything in Starter + brand admin, multi-branch P&L, WhatsApp, Market Pulse, Local Spotlight, Customer Voice.",
    includes: ["WHATSAPP", "MARKET_PULSE", "LOCAL_SPOTLIGHT", "CUSTOMER_VOICE", "BRAND_PL"],
  },
  {
    id: "ENTERPRISE",
    label: "Enterprise",
    pricePerBranch: null,
    description: "Everything in Growth + API access, vanity domain, dedicated onboarding & SLA. Custom quote.",
    includes: ["WHATSAPP", "MARKET_PULSE", "LOCAL_SPOTLIGHT", "CUSTOMER_VOICE", "BRAND_PL"],
  },
];

export const SKU_ADDONS: SkuAddonDefinition[] = [
  {
    id: "WHATSAPP",
    label: "WhatsApp campaigns & receipts",
    pricePerBranch: 1499,
    description: "Undercuts standalone WhatsApp Business API tools (₹2,000–8,000/mo).",
  },
  {
    id: "MARKET_PULSE",
    label: "Market Pulse",
    pricePerBranch: 999,
    minBranches: 2,
    description: "Branch ranking & coaching signals — requires 2+ branches.",
  },
  {
    id: "LOCAL_SPOTLIGHT",
    label: "Local Spotlight",
    pricePerBranch: 799,
    description: "Google visibility, local search rank & rival benchmarking.",
  },
  {
    id: "CUSTOMER_VOICE",
    label: "Reviews & Customer Voice",
    pricePerBranch: 699,
    description: "Desk ratings, Google routing, recovery queue.",
  },
  {
    id: "BRAND_PL",
    label: "Brand admin & multi-branch P&L",
    pricePerBranch: 1999,
    perBrand: true,
    minBranches: 2,
    description: "Priced per brand, not per branch — requires 2+ branches.",
  },
];

export const SEAT_SKU = {
  id: "SEAT" as const,
  label: "Extra manager/staff seat",
  pricePerSeat: 299,
  description: "Starter includes 1 seat — additional seats billed per seat/month.",
};

export function skuBaseTier(id: SkuBaseTier): SkuBaseDefinition {
  return SKU_BASE_TIERS.find((t) => t.id === id)!;
}

export function skuAddon(id: SkuAddonId): SkuAddonDefinition {
  return SKU_ADDONS.find((a) => a.id === id)!;
}

export interface SkuSelection {
  base: SkuBaseTier;
  addons: SkuAddonId[];
  branches: number;
  extraSeats: number;
  billingPeriod: BillingPeriod;
}

export interface SkuLineItem {
  key: string;
  label: string;
  qtyLabel: string;
  monthlyAmount: number;
  included: boolean;
}

export interface SkuQuote {
  lineItems: SkuLineItem[];
  monthlySubtotal: number;
  /** Total for the selected billing period — what gets saved as quotedAmount. */
  periodTotal: number;
  isCustom: boolean;
}

export function defaultSkuSelection(branches = 1): SkuSelection {
  return { base: "STARTER", addons: [], branches: Math.max(1, branches), extraSeats: 0, billingPeriod: "MONTHLY" };
}

/** True when an add-on is already bundled into the chosen base tier (sold, not addable separately). */
export function isAddonIncluded(base: SkuBaseTier, addon: SkuAddonId): boolean {
  return skuBaseTier(base).includes.includes(addon);
}

export function computeSkuQuote(selection: SkuSelection): SkuQuote {
  const branches = Math.max(1, selection.branches);
  const base = skuBaseTier(selection.base);
  const lineItems: SkuLineItem[] = [];
  const isCustom = base.pricePerBranch == null;

  const baseMonthly = base.pricePerBranch != null ? base.pricePerBranch * branches : 0;
  lineItems.push({
    key: "base",
    label: `${base.label} platform`,
    qtyLabel: `${branches} branch${branches === 1 ? "" : "es"}`,
    monthlyAmount: baseMonthly,
    included: false,
  });

  for (const addonId of selection.addons) {
    const addon = skuAddon(addonId);
    const included = isAddonIncluded(selection.base, addonId);
    const qty = addon.perBrand ? 1 : branches;
    const monthlyAmount = included ? 0 : addon.pricePerBranch * qty;
    lineItems.push({
      key: addonId,
      label: addon.label,
      qtyLabel: included ? `Included in ${base.label}` : addon.perBrand ? "per brand" : `${qty} branch${qty === 1 ? "" : "es"}`,
      monthlyAmount,
      included,
    });
  }

  if (selection.extraSeats > 0) {
    lineItems.push({
      key: "seats",
      label: SEAT_SKU.label,
      qtyLabel: `${selection.extraSeats} seat${selection.extraSeats === 1 ? "" : "s"}`,
      monthlyAmount: SEAT_SKU.pricePerSeat * selection.extraSeats,
      included: false,
    });
  }

  const monthlySubtotal = lineItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const periodTotal = Math.round(monthlySubtotal * monthsInPeriod(selection.billingPeriod));

  return { lineItems, monthlySubtotal, periodTotal, isCustom };
}

export type SkuCategoryId = "GUEST_EXPERIENCE" | "LOCAL_GROWTH" | "MULTI_BRANCH";

export interface SkuCategoryDefinition {
  id: SkuCategoryId;
  label: string;
  /** Framed as the customer's problem, not the feature name — what a rep pitches in the field. */
  pitch: string;
  addons: SkuAddonId[];
}

/** Groups the flat add-on list into sellable, pain-point-first categories for the claim flow. */
export const SKU_CATEGORIES: SkuCategoryDefinition[] = [
  {
    id: "GUEST_EXPERIENCE",
    label: "Guest experience",
    pitch: "WhatsApp reminders, reviews & recovery",
    addons: ["WHATSAPP", "CUSTOMER_VOICE"],
  },
  {
    id: "LOCAL_GROWTH",
    label: "Local growth",
    pitch: "Get found on Google, beat nearby rivals",
    addons: ["LOCAL_SPOTLIGHT", "MARKET_PULSE"],
  },
  {
    id: "MULTI_BRANCH",
    label: "Multi-branch control",
    pitch: "Brand-wide P&L & branch ranking",
    addons: ["BRAND_PL", "MARKET_PULSE"],
  },
];

/** A category reads "selected" once every add-on it represents is on the selection (or bundled free). */
export function isCategorySelected(selection: SkuSelection, category: SkuCategoryDefinition): boolean {
  return category.addons.every((a) => selection.addons.includes(a) || isAddonIncluded(selection.base, a));
}

/** Toggles a single product within a category — lets a rep enable/disable one item while pitching. */
export function toggleSkuAddon(selection: SkuSelection, addonId: SkuAddonId): SkuSelection {
  return {
    ...selection,
    addons: selection.addons.includes(addonId)
      ? selection.addons.filter((a) => a !== addonId)
      : [...selection.addons, addonId],
  };
}

export function toggleCategory(selection: SkuSelection, category: SkuCategoryDefinition): SkuSelection {
  if (isCategorySelected(selection, category)) {
    return { ...selection, addons: selection.addons.filter((a) => !category.addons.includes(a)) };
  }
  const merged = new Set(selection.addons);
  category.addons.forEach((a) => merged.add(a));
  return { ...selection, addons: Array.from(merged) };
}

/**
 * Growth bundles every current add-on for one flat per-branch price. Once a rep has picked enough
 * paid add-ons on Starter to cost more than Growth outright, surface the cheaper bundle instead of
 * letting the customer overpay — a rep-facing nudge, not an auto-switch.
 */
export function suggestGrowthUpgrade(selection: SkuSelection): { monthlySavings: number } | null {
  if (selection.base !== "STARTER") return null;
  const starterMonthly = computeSkuQuote(selection).monthlySubtotal;
  const growthMonthly = computeSkuQuote({ ...selection, base: "GROWTH" }).monthlySubtotal;
  const savings = starterMonthly - growthMonthly;
  return savings > 0 ? { monthlySavings: savings } : null;
}

export function serializeSkuSelection(selection: SkuSelection): string {
  return JSON.stringify(selection);
}

export function parseSkuSelection(value?: string | null): SkuSelection | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SkuSelection>;
    if (!parsed.base) return null;
    return {
      base: parsed.base,
      addons: Array.isArray(parsed.addons) ? parsed.addons : [],
      branches: parsed.branches ?? 1,
      extraSeats: parsed.extraSeats ?? 0,
      billingPeriod: parsed.billingPeriod ?? "MONTHLY",
    };
  } catch {
    return null;
  }
}
