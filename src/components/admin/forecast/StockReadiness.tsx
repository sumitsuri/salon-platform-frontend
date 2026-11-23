"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, PackageCheck } from "lucide-react";
import { api, type BranchStockReadiness, type StockReadinessItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertBanner, PageLoader, SegmentedControl } from "@/components/ui";
import { shortDate } from "./forecast-model";

const HORIZONS = ["3", "7", "14"] as const;
type Horizon = (typeof HORIZONS)[number];

/** Whole numbers for pieces and bottles, rounded for millilitres and grams so the page does not look falsely precise. */
function amount(v: number, unit: string): string {
  const n = unit === "ML" || unit === "G" ? Math.round(v / 10) * 10 : Math.round(v * 10) / 10;
  return `${n.toLocaleString("en-IN")} ${unit === "ML" ? "ml" : unit === "G" ? "g" : unit === "BOTTLE" ? "bottles" : "pcs"}`;
}

function Row({ item, t }: { item: StockReadinessItem; t: ReturnType<typeof useTranslations> }) {
  const short = item.status === "SHORT";
  const hasModel = item.basis !== "NONE";
  return (
    <tr className="border-t border-[var(--border)] align-top">
      <td className="px-3 py-2">
        <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
        <p className={cn("text-[12px]", short ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
          {short ? (item.runsOutOn ? t("runsOutOn", { date: shortDate(item.runsOutOn) }) : t("willRunOut")) : t("runningLow")}
        </p>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[var(--text-primary)]">{amount(item.onHand, item.unit)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
        {hasModel ? (
          <>
            <span className="text-[var(--text-primary)]">{amount(item.expectedNeed, item.unit)}</span>
            <span className="block text-[11px] text-[var(--text-tertiary)]">{t("ofWhichBooked", { amount: amount(item.bookedNeed, item.unit) })}</span>
          </>
        ) : (
          <span className="text-[var(--text-tertiary)]">{t("reorderAt", { amount: amount(item.reorderLevel, item.unit) })}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-[var(--text-primary)]">
        {item.suggestedOrder > 0 ? amount(item.suggestedOrder, item.unit) : "—"}
      </td>
    </tr>
  );
}

function BranchBlock({ branch, t }: { branch: BranchStockReadiness; t: ReturnType<typeof useTranslations> }) {
  const atRisk = branch.items.filter((i) => i.status === "SHORT" || i.status === "LOW");
  return (
    <div className="rounded-xl border border-[var(--border)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">{branch.name}</p>
        {branch.shortCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {t("shortCount", { count: branch.shortCount })}
          </span>
        )}
        {branch.lowCount > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {t("lowCount", { count: branch.lowCount })}
          </span>
        )}
        {atRisk.length === 0 && (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t("allSet")}
          </span>
        )}
        <span className="ml-auto text-[12px] text-[var(--text-tertiary)]">{t("bookedServices", { count: branch.bookedServices })}</span>
      </div>
      {atRisk.length > 0 && (
        <div className="overflow-auto border-t border-[var(--border)]">
          <table className="w-full min-w-[30rem] text-left text-[13px]">
            <thead className="bg-[var(--surface-muted)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2 font-semibold">{t("product")}</th>
                <th className="px-3 py-2 text-right font-semibold">{t("inStock")}</th>
                <th className="px-3 py-2 text-right font-semibold">{t("needed")}</th>
                <th className="px-3 py-2 text-right font-semibold">{t("orderAbout")}</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((i) => (
                <Row key={i.productId} item={i} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {branch.unknownCount > 0 && <p className="border-t border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-tertiary)]">{t("unknownCount", { count: branch.unknownCount })}</p>}
    </div>
  );
}

/**
 * Will the shelves cover the services that are booked, and the walk-ins that usually come on top? Products at risk are listed
 * per branch with how much is needed, when they run out and roughly how much to order.
 */
export function StockReadiness({ branchId }: { branchId: string | null }) {
  const t = useTranslations("admin.forecast.stock");
  const [horizon, setHorizon] = useState<Horizon>("7");
  const query = useQuery({
    queryKey: ["stock-readiness", horizon],
    queryFn: () => api.getStockReadiness(Number(horizon)),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
  });
  const data = query.data;
  const branches = data ? data.branches.filter((b) => !branchId || b.branchId === branchId) : [];
  const shortTotal = branches.reduce((s, b) => s + b.shortCount, 0);
  const lowTotal = branches.reduce((s, b) => s + b.lowCount, 0);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5" data-testid="stock-readiness">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <PackageCheck className="h-4 w-4 text-[var(--brand-text)]" aria-hidden />
            {t("title")}
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{t("subtitle")}</p>
        </div>
        <div className="w-full sm:w-56">
          <SegmentedControl value={horizon} onChange={setHorizon} options={HORIZONS.map((h) => ({ id: h, label: t("horizon", { days: h }) }))} />
        </div>
      </div>

      {query.isLoading && !data ? (
        <PageLoader />
      ) : query.isError && !data ? (
        <AlertBanner variant="error">{t("loadFailed")}</AlertBanner>
      ) : data ? (
        <div className={cn("space-y-3 transition-opacity", query.isFetching && "opacity-60")}>
          {!data.hasUsageHistory && <AlertBanner variant="info">{t("noUsage")}</AlertBanner>}
          <p className="text-[13px] text-[var(--text-secondary)]">
            {shortTotal + lowTotal === 0 ? t("summaryClear", { from: shortDate(data.from), to: shortDate(data.to) }) : t("summary", { short: shortTotal, low: lowTotal })}
          </p>
          {branches.map((b) => (
            <BranchBlock key={b.branchId} branch={b} t={t} />
          ))}
          <p className="text-[12px] text-[var(--text-tertiary)]">{t("how")}</p>
        </div>
      ) : null}
    </section>
  );
}
