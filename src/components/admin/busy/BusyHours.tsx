"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, type BranchDemand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertBanner, EmptyState, PageLoader, SegmentedControl } from "@/components/ui";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { Clock } from "lucide-react";
import { ActionBoard } from "./ActionBoard";
import { BranchDetail } from "./BranchDetail";
import { PERIODS, periodRange } from "./busy-model";

type PeriodId = (typeof PERIODS)[number]["id"];

export function BusyHours() {
  const t = useTranslations("admin.busyHours");
  const [period, setPeriod] = useState<PeriodId>("90");
  const [branchId, setBranchId] = useState<string | null>(null);
  const range = useMemo(() => periodRange(PERIODS.find((p) => p.id === period)?.days ?? 90), [period]);

  const query = useQuery({
    queryKey: ["busy-hours", range.startDate, range.endDate],
    queryFn: () => api.getDemandInsights(range),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const data = query.data;
  const branches: BranchDemand[] = useMemo(() => data?.branches ?? [], [data]);
  const selected = branchId ? branches.find((b) => b.branchId === branchId) ?? null : null;

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
    <DashboardOverviewShell>
    <div className="space-y-4" data-testid="busy-hours">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto sm:min-w-[22rem]">
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={PERIODS.map((p) => ({ id: p.id, label: t(`period${p.id}`) }))}
          />
        </div>
        <p className="text-xs text-[var(--text-secondary)]">{t("periodRange", { from: data.startDate, to: data.endDate })}</p>
      </div>

      <div className={cn("space-y-4 transition-opacity", query.isFetching && "opacity-60")}>
        {selected ? (
          <BranchDetail key={selected.branchId} branch={selected} insights={data} onBack={() => setBranchId(null)} />
        ) : (
          <ActionBoard branches={branches} onOpen={setBranchId} />
        )}
      </div>
    </div>
    </DashboardOverviewShell>
  );
}
