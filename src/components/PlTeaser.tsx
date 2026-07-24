"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, IndianRupee } from "lucide-react";
import { PlSummaryResponse } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PanelShell, PanelLink } from "@/components/enterprise-ui";

interface PlTeaserProps {
  data?: PlSummaryResponse;
  loading?: boolean;
  href: string;
}

export function PlTeaser({ data, loading, href }: PlTeaserProps) {
  const t = useTranslations("components.plTeaser");
  const tCommon = useTranslations("common");
  const brand = data?.brand;
  const topBranches = data?.branches.slice(0, 2) ?? [];
  const profit = brand?.netProfit ?? 0;
  const margin = brand?.marginPercent ?? 0;

  return (
    <PanelShell
      title={t("title")}
      subtitle={loading ? tCommon("loading") : data?.periodLabel ?? t("subtitleDefault")}
      icon={IndianRupee}
      accent="emerald"
      action={
        <PanelLink href={href}>
          {t("viewFinance")}
          <ChevronRight className="w-3.5 h-3.5" />
        </PanelLink>
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("calculating")}</p>
      ) : !brand ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: t("revenue"), value: formatCurrency(brand.revenue), color: "text-emerald-600" },
              { label: t("expenses"), value: formatCurrency(brand.totalExpenses), color: "text-red-600" },
              {
                label: t("netPl"),
                value: formatCurrency(profit),
                color: profit >= 0 ? "text-emerald-600" : "text-red-600",
              },
            ].map((cell) => (
              <div
                key={cell.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 text-center"
              >
                <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--text-tertiary)]">{cell.label}</p>
                <p className={cn("text-sm font-bold tabular-nums mt-1", cell.color)}>{cell.value}</p>
              </div>
            ))}
          </div>

          {topBranches.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
              {topBranches.map((b) => (
                <Link
                  key={b.branchId}
                  href={href}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--surface-muted)]/60 transition text-sm"
                >
                  <span className="font-medium truncate">{b.branchName}</span>
                  <span className={cn("font-bold shrink-0 ml-2 tabular-nums", b.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatCurrency(b.netProfit)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <p className="text-xs text-[var(--text-tertiary)] text-center font-medium">
            {t("brandMargin", { percent: margin.toFixed(1) })}
          </p>
        </div>
      )}
    </PanelShell>
  );
}
