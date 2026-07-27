"use client";

import { useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { BillingPeriod, SalesLead } from "@/modules/sales/api/salesApi";
import {
  BILLING_PERIOD_OPTIONS,
  formatQuotedPrice,
  formatFinalPaidPrice,
  formatDiscountPercent,
  formatInr,
  pricingFieldsFromLead,
  syncFromQuoted,
  syncFromDiscountPercent,
  syncFromDiscountAmount,
  syncFromFinalPaid,
  type LeadPricingFields,
} from "@/modules/sales/lib/pricing";
import { isTerminalStage } from "@/modules/sales/lib/stage-utils";
import { inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/ui";

type UpdateLeadPayload = {
  quotedAmount?: number;
  billingPeriod?: BillingPeriod;
  discountPercent?: number;
  discountAmount?: number;
  finalPaidAmount?: number;
};

type LeadPricingSectionProps = {
  lead: SalesLead;
  updateLeadMutation: UseMutationResult<unknown, Error, UpdateLeadPayload, unknown>;
};

export function LeadPricingSection({ lead, updateLeadMutation }: LeadPricingSectionProps) {
  const [editingPricing, setEditingPricing] = useState(false);
  const [pricingFields, setPricingFields] = useState<LeadPricingFields | null>(() =>
    pricingFieldsFromLead(lead)
  );

  const hasPricing =
    lead.quotedAmount != null ||
    lead.finalPaidAmount != null ||
    (lead.discountPercent != null && lead.discountPercent > 0);

  const finalPaidDisplay = formatFinalPaidPrice(
    lead.finalPaidAmount ?? lead.quotedAmount,
    lead.billingPeriod
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
          Pricing
        </p>
        {!isTerminalStage(lead.stage) && !editingPricing && (
          <button
            type="button"
            className="text-xs text-violet-600 hover:underline"
            onClick={() => {
              setPricingFields(pricingFieldsFromLead(lead));
              setEditingPricing(true);
            }}
          >
            Edit
          </button>
        )}
      </div>
      {editingPricing && pricingFields ? (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-[var(--ink-muted)]">Quoted price</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className={`${inputClass} min-w-0`}
                type="number"
                min={0}
                placeholder="Quoted amount (₹)"
                value={pricingFields.quotedAmount || ""}
                onChange={(e) =>
                  setPricingFields((prev) =>
                    prev
                      ? syncFromQuoted({
                          ...prev,
                          quotedAmount: e.target.value ? Number(e.target.value) : 0,
                        })
                      : prev
                  )
                }
              />
              <select
                className={`${selectClass} w-full min-w-[9.5rem] sm:w-auto`}
                value={pricingFields.billingPeriod}
                onChange={(e) =>
                  setPricingFields((prev) =>
                    prev ? { ...prev, billingPeriod: e.target.value as BillingPeriod } : prev
                  )
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-[var(--ink-muted)]">Discount (%)</p>
              <input
                className={inputClass}
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                value={pricingFields.discountPercent || ""}
                onChange={(e) =>
                  setPricingFields((prev) =>
                    prev
                      ? syncFromDiscountPercent({
                          ...prev,
                          discountPercent: e.target.value ? Number(e.target.value) : 0,
                        })
                      : prev
                  )
                }
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--ink-muted)]">Discount (₹)</p>
              <input
                className={inputClass}
                type="number"
                min={0}
                placeholder="0"
                value={pricingFields.discountAmount || ""}
                onChange={(e) =>
                  setPricingFields((prev) =>
                    prev
                      ? syncFromDiscountAmount({
                          ...prev,
                          discountAmount: e.target.value ? Number(e.target.value) : 0,
                        })
                      : prev
                  )
                }
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-[var(--ink-muted)]">Final paid price</p>
            <input
              className={inputClass}
              type="number"
              min={0}
              placeholder="Final amount (₹)"
              value={pricingFields.finalPaidAmount || ""}
              onChange={(e) =>
                setPricingFields((prev) =>
                  prev
                    ? syncFromFinalPaid({
                        ...prev,
                        finalPaidAmount: e.target.value ? Number(e.target.value) : 0,
                      })
                    : prev
                )
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={updateLeadMutation.isPending || !pricingFields.quotedAmount}
              onClick={() =>
                updateLeadMutation.mutate(
                  {
                    quotedAmount: pricingFields.quotedAmount,
                    billingPeriod: pricingFields.billingPeriod,
                    discountPercent: pricingFields.discountPercent,
                    discountAmount: pricingFields.discountAmount,
                    finalPaidAmount: pricingFields.finalPaidAmount,
                  },
                  {
                    onSuccess: () => setEditingPricing(false),
                  }
                )
              }
            >
              Save
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setEditingPricing(false);
                setPricingFields(pricingFieldsFromLead(lead));
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : hasPricing ? (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ink-muted)]">Quoted</dt>
            <dd>{formatQuotedPrice(lead.quotedAmount, lead.billingPeriod)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ink-muted)]">Discount</dt>
            <dd>
              {formatDiscountPercent(lead.discountPercent)}
              {lead.discountAmount != null && lead.discountAmount > 0 && (
                <span className="text-[var(--ink-muted)]"> ({formatInr(lead.discountAmount)})</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 font-medium">
            <dt className="text-[var(--ink-muted)]">Final paid</dt>
            <dd>{finalPaidDisplay}</dd>
          </div>
          {lead.projectedMrr != null && lead.projectedMrr > 0 && (
            <p className="text-xs text-[var(--ink-muted)]">
              ≈ ₹{Math.round(lead.projectedMrr).toLocaleString("en-IN")}/mo for reporting
            </p>
          )}
        </dl>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">No pricing set yet.</p>
      )}
    </div>
  );
}
