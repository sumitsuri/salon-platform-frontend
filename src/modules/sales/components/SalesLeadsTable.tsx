"use client";

import Link from "next/link";
import { SalesLead } from "@/modules/sales/api/salesApi";
import { STAGE_LABELS, isTerminalStage } from "@/modules/sales/lib/stage-utils";
import { formatQuotedPrice, formatFinalPaidPrice, formatDiscountPercent } from "@/modules/sales/lib/pricing";
import { formatLeadSource } from "@/modules/sales/lib/source-labels";
import { salesLeadDetailHref } from "@/modules/sales/lib/lead-routes";
import { Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { enterpriseTableHead } from "@/components/enterprise-ui";

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

function StagePill({ stage }: { stage: SalesLead["stage"] }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
        stage === "WON" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
        stage === "LOST" && "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
        !isTerminalStage(stage) && "bg-[var(--brand-light)] text-[var(--brand-text)]"
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

interface SalesLeadsTableProps {
  leads: SalesLead[];
  emptyMessage?: string;
}

export function SalesLeadsTable({ leads, emptyMessage = "No leads in this period" }: SalesLeadsTableProps) {
  if (leads.length === 0) {
    return (
      <Card>
        <EmptyState title={emptyMessage} />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0" padding={false}>
      {/* Mobile / tablet card list */}
      <div className="lg:hidden divide-y divide-[var(--border)]" data-testid="sales-leads-mobile-list">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={salesLeadDetailHref(lead.id)}
            className="flex items-start gap-3 px-4 py-3.5 touch-manipulation min-h-[64px] hover:bg-[var(--surface-muted)] active:bg-[var(--brand-light)]"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{lead.businessName}</p>
                <StagePill stage={lead.stage} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {lead.contactName} · {lead.phone}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatLeadSource(lead.source)} · {formatDate(lead.createdAt)}
                {lead.localityName ? ` · ${lead.localityName}` : ""}
              </p>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {formatQuotedPrice(lead.quotedAmount, lead.billingPeriod)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-tertiary)] mt-1" />
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block responsive-table-wrap">
        <table className="w-full min-w-[960px] text-left text-sm" data-testid="sales-leads-table">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--brand-muted)]">
              {[
                "Business",
                "Contact",
                "Status",
                "Source",
                "Type",
                "Location",
                "Quoted",
                "Discount",
                "Final paid",
                "Created",
                "",
              ].map((h) => (
                <th key={h || "go"} className={cn("px-4 py-3 font-semibold whitespace-nowrap", enterpriseTableHead)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {leads.map((lead) => (
              <tr key={lead.id} className="group transition hover:bg-[var(--surface-muted)]">
                <td className="px-4 py-3">
                  <Link
                    href={salesLeadDetailHref(lead.id)}
                    className="font-medium text-[var(--brand-text)] hover:underline"
                  >
                    {lead.businessName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  <div>{lead.contactName}</div>
                  <div className="text-xs">{lead.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <StagePill stage={lead.stage} />
                </td>
                <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{formatLeadSource(lead.source)}</td>
                <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{formatType(lead.leadType)}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{lead.localityName || "—"}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatQuotedPrice(lead.quotedAmount, lead.billingPeriod)}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDiscountPercent(lead.discountPercent)}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatFinalPaidPrice(lead.finalPaidAmount, lead.billingPeriod)}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(lead.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={salesLeadDetailHref(lead.id)}
                    className="inline-flex items-center text-[var(--brand-text)] opacity-0 transition group-hover:opacity-100"
                    aria-label={`Open ${lead.businessName}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
