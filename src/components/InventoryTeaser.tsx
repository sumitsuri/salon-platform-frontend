"use client";

import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { InventoryOverview } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui";

interface InventoryTeaserProps {
  data?: InventoryOverview;
  loading?: boolean;
  href: string;
}

export function InventoryTeaser({ data, loading, href }: InventoryTeaserProps) {
  return (
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--brand-text)]" />
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">Inventory</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {loading ? "Loading..." : data?.periodLabel ?? "Stock & product usage"}
            </p>
          </div>
        </div>
        <Link href={href} className="link-brand text-xs flex items-center gap-0.5">
          Manage
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">Loading inventory...</p>
      ) : !data ? (
        <p className="p-4 text-sm text-[var(--text-secondary)]">Set up products and vendors to track branch inventory.</p>
      ) : (
        <div className="p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Product cost</p>
            <p className="text-sm font-bold">{formatCurrency(data.totalProductCost)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Stock value</p>
            <p className="text-sm font-bold">{formatCurrency(data.totalStockValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Alerts</p>
            <p className="text-sm font-bold text-amber-600">
              {data.lowStockCount + data.outOfStockCount} item{(data.lowStockCount + data.outOfStockCount) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
