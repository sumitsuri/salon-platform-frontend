"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, type BranchDemand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertBanner, EmptyState, PageLoader, SegmentedControl, inputClass } from "@/components/ui";
import { Clock } from "lucide-react";
import { BranchCard } from "./BranchCard";
import { BranchDetail } from "./BranchDetail";
import { PERIODS, formatInr, periodRange } from "./busy-model";

type PeriodId = (typeof PERIODS)[number]["id"];

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
      <p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--text-primary)] leading-tight">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{sub}</p> : null}
    </div>
  );
}

export function BusyHours() {
  const t = useTranslations("admin.busyHours");
  const [period, setPeriod] = useState<PeriodId>("90");
  const [branchId, setBranchId] = useState<string>("all");
  const range = useMemo(() => periodRange(PERIODS.find((p) => p.id === period)?.days ?? 90), [period]);

  const query = useQuery({
    queryKey: ["busy-hours", range.startDate, range.endDate],
    queryFn: () => api.getDemandInsights(range),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const data = query.data;
  const branches: BranchDemand[] = useMemo(() => data?.branches ?? [], [data]);
  const selected = branchId === "all" ? null : branches.find((b) => b.branchId === branchId) ?? null;

  const sorted = useMemo(() => {
    const score = (b: BranchDemand) =>
      b.recommendations.filter((r) => r.priority === "HIGH").length * 100 + b.recommendations.length;
    return [...branches].sort((a, b) => score(b) - score(a) || a.branchName.localeCompare(b.branchName));
  }, [branches]);

  const portfolio = useMemo(() => {
    const withData = branches.filter((b) => b.enoughData && b.summary);
    const busy = withData.map((b) => b.summary!.teamBusyPercent).filter((v): v is number => v != null);
    return {
      needAction: branches.filter((b) => b.recommendations.some((r) => r.priority === "HIGH")).length,
      avgBusy: busy.length ? Math.round(busy.reduce((a, c) => a + c, 0) / busy.length) : null,
      idleCost: withData.reduce((a, b) => a + (b.summary!.idleStaffCostPerMonth ?? 0), 0),
      withData: withData.length,
    };
  }, [branches]);

  if (query.isLoading && !data) return <PageLoader />;
  if (query.isError && !data) return <AlertBanner variant="error">{t("loadFailed")}</AlertBanner>;
  if (!data || branches.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <EmptyState icon={Clock} title={t("emptyTitle")} description={t("emptyBody")} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="busy-hours">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <label htmlFor="busy-branch" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t("branch")}</label>
          <select id="busy-branch" className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="all">{t("allBranchesOption")}</option>
            {[...branches].sort((a, b) => a.branchName.localeCompare(b.branchName)).map((b) => (
              <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[22rem]">
          <p className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t("period")}</p>
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={PERIODS.map((p) => ({ id: p.id, label: t(`period${p.id}`) }))}
          />
        </div>
        <p className="text-xs text-[var(--text-secondary)] sm:pb-3">{t("periodRange", { from: data.startDate, to: data.endDate })}</p>
      </div>

      <div className={cn("space-y-4 transition-opacity", query.isFetching && "opacity-60")}>
        {selected ? (
          <BranchDetail key={selected.branchId} branch={selected} insights={data} onBack={() => setBranchId("all")} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label={t("portfolioNeedAction")} value={`${portfolio.needAction} ${t("ofBranches", { n: branches.length })}`} sub={t("portfolioNeedActionSub")} />
              <Stat
                label={t("portfolioBusy")}
                value={portfolio.avgBusy != null ? `${portfolio.avgBusy}%` : "—"}
                sub={portfolio.avgBusy != null ? t("portfolioBusySub") : t("noAttendanceShort")}
              />
              <Stat
                label={t("portfolioIdle")}
                value={portfolio.idleCost > 0 ? `≈ ${formatInr(portfolio.idleCost)}` : "—"}
                sub={portfolio.idleCost > 0 ? t("portfolioIdleSub") : undefined}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t("branchesTitle")}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("branchesHint")}</p>
            </div>
            <div className="grid gap-3 grid-cols-1 min-[560px]:grid-cols-2 hub:grid-cols-3 min-[1400px]:grid-cols-4">
              {sorted.map((b) => (
                <BranchCard key={b.branchId} branch={b} onOpen={() => setBranchId(b.branchId)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
