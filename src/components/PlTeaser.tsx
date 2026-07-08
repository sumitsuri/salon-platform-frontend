"use client";

import Link from "next/link";
import { ChevronRight, IndianRupee } from "lucide-react";
import { PlSummaryResponse } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Card } from "@/components/ui";

interface PlTeaserProps {
  data?: PlSummaryResponse;
  loading?: boolean;
  href: string;
}

export function PlTeaser({ data, loading, href }: PlTeaserProps) {
  const brand = data?.brand;
  const topBranches = data?.branches.slice(0, 2) ?? [];
  const profit = brand?.netProfit ?? 0;
  const margin = brand?.marginPercent ?? 0;

  return (
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-[var(--brand-text)]" />
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">P&amp;L</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {loading ? "Loading..." : data?.periodLabel ?? "Revenue vs expenses"}
            </p>
          </div>
        </div>
        <Link href={href} className="link-brand text-xs flex items-center gap-0.5">
          View finance
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">Calculating profit &amp; loss...</p>
      ) : !brand ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">
          Add expenditure line items to see branch and brand-level P&amp;L.
        </p>
      ) : (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Revenue</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(brand.revenue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Expenses</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(brand.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Net P&amp;L</p>
              <p className={cn("text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>

          {topBranches.length > 0 && (
            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
              {topBranches.map((b) => (
                <Link
                  key={b.branchId}
                  href={href}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-muted)] transition text-sm"
                >
                  <span className="font-medium truncate">{b.branchName}</span>
                  <span className={cn("font-semibold shrink-0 ml-2", b.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatCurrency(b.netProfit)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <p className="text-xs text-[var(--text-tertiary)] text-center">
            Brand margin {margin.toFixed(1)}%
          </p>
        </div>
      )}
    </Card>
  );
}
