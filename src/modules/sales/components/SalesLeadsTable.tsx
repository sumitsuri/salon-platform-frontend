"use client";

import Link from "next/link";
import { SalesLead } from "@/modules/sales/api/salesApi";
import { STAGE_LABELS, isTerminalStage } from "@/modules/sales/lib/stage-utils";
import { formatQuotedPrice, formatFinalPaidPrice, formatDiscountPercent } from "@/modules/sales/lib/pricing";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

function formatSource(source: string): string {
  return source.replace(/_/g, " ");
}

function formatType(type: string): string {
  return type.replace(/_/g, " ");
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface SalesLeadsTableProps {
  leads: SalesLead[];
  emptyMessage?: string;
}

export function SalesLeadsTable({ leads, emptyMessage = "No leads in this period" }: SalesLeadsTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm" data-testid="sales-leads-table">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              <th className="px-4 py-3 font-semibold">Business</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Quoted</th>
              <th className="px-4 py-3 font-semibold">Discount</th>
              <th className="px-4 py-3 font-semibold">Final paid</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="group transition hover:bg-[var(--surface-muted)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/sales/leads/${lead.id}`}
                      className="font-medium text-violet-700 hover:underline"
                    >
                      {lead.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    <div>{lead.contactName}</div>
                    <div className="text-xs">{lead.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        lead.stage === "WON" && "bg-emerald-100 text-emerald-700",
                        lead.stage === "LOST" && "bg-red-100 text-red-700",
                        !isTerminalStage(lead.stage) && "bg-violet-100 text-violet-700"
                      )}
                    >
                      {STAGE_LABELS[lead.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-[var(--ink-muted)]">
                    {formatSource(lead.source)}
                  </td>
                  <td className="px-4 py-3 capitalize text-[var(--ink-muted)]">
                    {formatType(lead.leadType)}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {lead.localityName || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {formatQuotedPrice(lead.quotedAmount, lead.billingPeriod)}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {formatDiscountPercent(lead.discountPercent)}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {formatFinalPaidPrice(lead.finalPaidAmount, lead.billingPeriod)}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/sales/leads/${lead.id}`}
                      className="inline-flex items-center text-violet-600 opacity-0 transition group-hover:opacity-100"
                      aria-label={`Open ${lead.businessName}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
