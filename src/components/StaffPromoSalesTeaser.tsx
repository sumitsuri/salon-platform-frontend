"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Gift } from "lucide-react";
import { StaffPromoSalesResponse, StaffPromoSalesRow } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PanelShell } from "@/components/enterprise-ui";

const GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(3rem,auto)_minmax(3.5rem,auto)_minmax(4rem,auto)] items-center gap-x-2 sm:gap-x-3";

interface StaffPromoSalesTeaserProps {
  data?: StaffPromoSalesResponse;
  loading?: boolean;
}

function sortByMembership(rows: StaffPromoSalesRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.membershipTotalEarnings - a.membershipTotalEarnings ||
      b.membershipTodayEarnings - a.membershipTodayEarnings ||
      a.staffName.localeCompare(b.staffName)
  );
}

function sortByPackage(rows: StaffPromoSalesRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.packageTotalEarnings - a.packageTotalEarnings ||
      b.packageTodayEarnings - a.packageTodayEarnings ||
      a.staffName.localeCompare(b.staffName)
  );
}

function PromoEarningsTable({
  rows,
  kind,
  labels,
}: {
  rows: StaffPromoSalesRow[];
  kind: "membership" | "package";
  labels: {
    staff: string;
    soldToday: string;
    todayEarn: string;
    totalEarn: string;
  };
}) {
  return (
    <>
      <div
        className={cn(
          "ui-table-head border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2 grid sm:px-4",
          GRID
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
          {labels.staff}
        </span>
        <span className="text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
          {labels.soldToday}
        </span>
        <span className="text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
          {labels.todayEarn}
        </span>
        <span className="text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] sm:text-[11px]">
          {labels.totalEarn}
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {rows.map((row) => {
          const countToday = kind === "membership" ? row.membershipCountToday : row.packageCountToday;
          const todayEarn =
            kind === "membership"
              ? (row.membershipTodayEarnings ?? row.membershipCountToday * 50)
              : (row.packageTodayEarnings ?? 0);
          const totalEarn =
            kind === "membership"
              ? (row.membershipTotalEarnings ?? row.membershipCountTotal * 50)
              : (row.packageTotalEarnings ?? 0);
          const countTotal = kind === "membership" ? row.membershipCountTotal : row.packageCountTotal;
          return (
            <div key={`${kind}-${row.staffId}`} className={cn("px-3 py-2.5 grid sm:px-4", GRID)}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{row.staffName}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{countTotal} sold</p>
              </div>
              <span className="text-right text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {countToday}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatCurrency(todayEarn)}
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-[var(--text-primary)]">
                {formatCurrency(totalEarn)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function StaffPromoSalesTeaser({ data, loading }: StaffPromoSalesTeaserProps) {
  const t = useTranslations("components.staffPromoSalesTeaser");
  const tCommon = useTranslations("common");
  const rows = data?.staff ?? [];
  const membershipRows = useMemo(() => sortByMembership(rows), [rows]);
  const packageRows = useMemo(() => sortByPackage(rows), [rows]);

  const tableLabels = {
    staff: t("staff"),
    soldToday: t("soldToday"),
    todayEarn: t("todayEarn"),
    totalEarn: t("totalEarn"),
  };

  if (loading) {
    return (
      <PanelShell
        title={t("titleShort")}
        subtitle={tCommon("loading")}
        icon={Gift}
        accent="emerald"
        variant="dashboard"
        padding={false}
      >
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("analyzing")}</p>
      </PanelShell>
    );
  }

  if (rows.length === 0) {
    return (
      <PanelShell
        title={t("titleShort")}
        subtitle={t("noData")}
        icon={Gift}
        accent="emerald"
        variant="dashboard"
        padding={false}
      >
        <p className="p-4 text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      </PanelShell>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <PanelShell
        title={t("membershipTableTitle")}
        subtitle={t("membershipTableSubtitle", {
          amount: formatCurrency(data?.membershipIncentivePerSale ?? 50),
        })}
        icon={CreditCard}
        accent="emerald"
        variant="dashboard"
        padding={false}
      >
        <PromoEarningsTable rows={membershipRows} kind="membership" labels={tableLabels} />
      </PanelShell>

      <PanelShell
        title={t("packageTableTitle")}
        subtitle={t("packageTableSubtitle", {
          percent: data?.packageIncentivePercent ?? 3,
        })}
        icon={Gift}
        accent="brand"
        variant="dashboard"
        padding={false}
      >
        <PromoEarningsTable rows={packageRows} kind="package" labels={tableLabels} />
      </PanelShell>
    </div>
  );
}
