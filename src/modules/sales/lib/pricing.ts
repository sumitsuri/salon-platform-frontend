import { BillingPeriod } from "@/modules/sales/api/salesApi";

export const BILLING_PERIOD_OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "MONTHLY", label: "Per month" },
  { value: "QUARTERLY", label: "Per quarter" },
  { value: "HALF_YEARLY", label: "Per half-year" },
  { value: "YEARLY", label: "Per year" },
];

export interface LeadPricingFields {
  quotedAmount: number;
  billingPeriod: BillingPeriod;
  discountPercent: number;
  discountAmount: number;
  finalPaidAmount: number;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthsInPeriod(period?: BillingPeriod | null): number {
  switch (period) {
    case "YEARLY":
      return 12;
    case "HALF_YEARLY":
      return 6;
    case "QUARTERLY":
      return 3;
    default:
      return 1;
  }
}

const PERIOD_SUFFIX: Record<BillingPeriod, string> = {
  MONTHLY: "/mo",
  QUARTERLY: "/qtr",
  HALF_YEARLY: "/6mo",
  YEARLY: "/yr",
};

export function formatInr(amount?: number | null): string {
  if (amount == null || amount <= 0) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatQuotedPrice(
  amount?: number | null,
  period?: BillingPeriod | null
): string {
  if (amount == null || amount <= 0) return "—";
  const formatted = formatInr(amount);
  if (period && PERIOD_SUFFIX[period]) return `${formatted}${PERIOD_SUFFIX[period]}`;
  return formatted;
}

export function formatFinalPaidPrice(
  amount?: number | null,
  period?: BillingPeriod | null
): string {
  return formatQuotedPrice(amount, period);
}

export function formatDiscountPercent(value?: number | null): string {
  if (value == null || value <= 0) return "—";
  return `${roundMoney(value)}%`;
}

export function monthlyEquivalent(amount?: number | null, period?: BillingPeriod | null): number {
  if (amount == null || amount <= 0) return 0;
  return Math.round(amount / monthsInPeriod(period));
}

export function formatMonthlyRevenue(amount?: number | null): string {
  if (amount == null || amount <= 0) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}/mo`;
}

export function emptyPricingFields(): LeadPricingFields {
  return {
    quotedAmount: 0,
    billingPeriod: "MONTHLY",
    discountPercent: 0,
    discountAmount: 0,
    finalPaidAmount: 0,
  };
}

export function pricingFieldsFromLead(lead: {
  quotedAmount?: number;
  billingPeriod?: BillingPeriod;
  discountPercent?: number;
  discountAmount?: number;
  finalPaidAmount?: number;
}): LeadPricingFields {
  const quoted = lead.quotedAmount ?? 0;
  const discountPercent = lead.discountPercent ?? 0;
  const discountAmount = lead.discountAmount ?? 0;
  const finalPaidAmount =
    lead.finalPaidAmount ?? (quoted > 0 ? Math.max(0, quoted - discountAmount) : 0);
  return {
    quotedAmount: quoted,
    billingPeriod: lead.billingPeriod ?? "MONTHLY",
    discountPercent,
    discountAmount,
    finalPaidAmount,
  };
}

function clampDiscount(quoted: number, discount: number): number {
  return Math.max(0, Math.min(discount, quoted));
}

export function syncFromQuoted(fields: LeadPricingFields): LeadPricingFields {
  const quoted = Math.max(0, fields.quotedAmount);
  const pct = Math.max(0, Math.min(fields.discountPercent, 100));
  const discountAmount = roundMoney((quoted * pct) / 100);
  return {
    ...fields,
    quotedAmount: quoted,
    discountPercent: pct,
    discountAmount,
    finalPaidAmount: roundMoney(quoted - discountAmount),
  };
}

export function syncFromDiscountPercent(fields: LeadPricingFields): LeadPricingFields {
  const quoted = Math.max(0, fields.quotedAmount);
  const pct = Math.max(0, Math.min(fields.discountPercent, 100));
  const discountAmount = roundMoney((quoted * pct) / 100);
  return {
    ...fields,
    discountPercent: pct,
    discountAmount,
    finalPaidAmount: roundMoney(quoted - discountAmount),
  };
}

export function syncFromDiscountAmount(fields: LeadPricingFields): LeadPricingFields {
  const quoted = Math.max(0, fields.quotedAmount);
  const discountAmount = clampDiscount(quoted, fields.discountAmount);
  const discountPercent = quoted > 0 ? roundMoney((discountAmount / quoted) * 100) : 0;
  return {
    ...fields,
    discountAmount,
    discountPercent,
    finalPaidAmount: roundMoney(quoted - discountAmount),
  };
}

export function syncFromFinalPaid(fields: LeadPricingFields): LeadPricingFields {
  const quoted = Math.max(0, fields.quotedAmount);
  const finalPaidAmount = clampDiscount(quoted, fields.finalPaidAmount);
  const discountAmount = roundMoney(quoted - finalPaidAmount);
  const discountPercent = quoted > 0 ? roundMoney((discountAmount / quoted) * 100) : 0;
  return {
    ...fields,
    finalPaidAmount,
    discountAmount,
    discountPercent,
  };
}

export function syncFromBillingPeriod(fields: LeadPricingFields): LeadPricingFields {
  return fields;
}

export function monthlyRevenueFromFields(fields: LeadPricingFields): number {
  const base = fields.finalPaidAmount > 0 ? fields.finalPaidAmount : fields.quotedAmount;
  return monthlyEquivalent(base, fields.billingPeriod);
}
