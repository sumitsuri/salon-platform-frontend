"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { salesApi, LeadStage } from "@/modules/sales/api/salesApi";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/modules/sales/lib/stage-utils";
import { salesQueryKeys } from "@/modules/sales/lib/query-keys";
import { SalesPipelineToolbar } from "@/modules/sales/components/SalesPipelineToolbar";
import { useSalesPipelineParams } from "@/modules/sales/hooks/useSalesPipelineParams";
import {
  buildLeadListParams,
  salesPathWithSearchParams,
} from "@/modules/sales/lib/pipeline-search-params";
import { EMPTY_FILTERS } from "@/modules/sales/components/SalesLeadFilters";
import { formatDateRangeLabel } from "@/modules/sales/lib/date-range";
import { PageHeader, Card, StatCard } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";
import {
  TrendingUp,
  Target,
  Users,
  IndianRupee,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function weekStartIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function ProgressBar({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {actual}/{target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-violet-500" : "bg-amber-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SalesGrowthPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "PLATFORM_SUPER_ADMIN");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAdmin) {
      const q = searchParams.toString();
      router.replace(q ? `/platform/overview?${q}` : "/platform/overview");
    }
  }, [isAdmin, router, searchParams]);

  if (isAdmin) {
    return null;
  }

  return <RepProgressPage />;
}

function RepProgressPage() {
  const searchParams = useSearchParams();
  const { dateRange, setDateRange } = useSalesPipelineParams();
  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);
  const week = weekStartIso();

  const { data: perf, isLoading } = useQuery({
    queryKey: ["sales-my-analytics", dateRange.from, dateRange.to],
    queryFn: () => salesApi.myAnalytics({ from: dateRange.from, to: dateRange.to }),
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["sales-my-targets", week],
    queryFn: () => salesApi.listTargets(week),
  });

  const { data: leadsPage } = useQuery({
    queryKey: salesQueryKeys.leadsProgress(dateRange.from, dateRange.to, []),
    queryFn: () => salesApi.listLeads(buildLeadListParams(EMPTY_FILTERS, dateRange)),
  });

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<
      LeadStage,
      number
    >;
    for (const lead of leadsPage?.content ?? []) {
      if (counts[lead.stage] !== undefined) counts[lead.stage]++;
    }
    return counts;
  }, [leadsPage?.content]);

  const target = targets[0];

  if (isLoading) {
    return <Card className="p-8 text-center text-sm">Loading your progress…</Card>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Progress"
        subtitle="Your weekly targets, activity, and pipeline trends"
      />

      <SalesPipelineToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateTestId="progress-date-range"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leads added"
          value={perf?.leadsAdded ?? 0}
          icon={Users}
          accent="violet"
          trend={periodLabel}
        />
        <StatCard label="Visits" value={perf?.visits ?? 0} icon={Target} />
        <StatCard label="Pitches" value={perf?.pitches ?? 0} icon={TrendingUp} accent="amber" />
        <StatCard
          label="Incentive earned"
          value={`₹${Math.round(perf?.incentiveEarned ?? 0).toLocaleString("en-IN")}`}
          icon={IndianRupee}
          accent="emerald"
        />
      </div>

      <Card className="space-y-4 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Activity summary</h3>
          <span className="text-xs text-[var(--ink-muted)]">{periodLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg bg-[var(--surface-muted)] p-3 text-center">
            <p className="text-xs text-[var(--ink-muted)]">Leads</p>
            <p className="text-xl font-bold">{perf?.leadsAdded ?? 0}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface-muted)] p-3 text-center">
            <p className="text-xs text-[var(--ink-muted)]">Visits</p>
            <p className="text-xl font-bold">{perf?.visits ?? 0}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface-muted)] p-3 text-center">
            <p className="text-xs text-[var(--ink-muted)]">Pitches</p>
            <p className="text-xl font-bold">{perf?.pitches ?? 0}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface-muted)] p-3 text-center">
            <p className="text-xs text-[var(--ink-muted)]">Trials</p>
            <p className="text-xl font-bold">{perf?.trials ?? 0}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-center">
            <p className="text-xs text-[var(--ink-muted)]">Wins</p>
            <p className="text-xl font-bold text-emerald-700">{perf?.conversions ?? 0}</p>
          </div>
        </div>
      </Card>

      {target && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Weekly targets</h3>
            <span className="text-xs text-[var(--ink-muted)]">Current week · {week}</span>
          </div>
          <ProgressBar label="New leads" actual={target.actualLeads ?? 0} target={target.targetLeads} />
          <ProgressBar label="Visits" actual={target.actualVisits ?? 0} target={target.targetVisits} />
          <ProgressBar label="Pitches" actual={target.actualPitches ?? 0} target={target.targetPitches} />
          <ProgressBar label="Trials" actual={target.actualTrials ?? 0} target={target.targetTrials} />
          <ProgressBar
            label="Conversions"
            actual={target.actualConversions ?? 0}
            target={target.targetConversions}
          />
        </Card>
      )}

      {!target && (
        <Card className="p-4 text-sm text-[var(--ink-muted)]">
          No targets set for this week yet. Your manager will assign them from the Team page.
        </Card>
      )}

      <Card className="p-4">
        <h3 className="mb-3 font-semibold">My pipeline snapshot</h3>
        <p className="mb-3 text-xs text-[var(--ink-muted)]">
          Leads created in selected period · {periodLabel}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage}
              className={cn(
                "rounded-lg p-2 text-center",
                stage === "WON" && "bg-emerald-50",
                stage === "LOST" && "bg-red-50",
                stage !== "WON" && stage !== "LOST" && "bg-[var(--surface-muted)]"
              )}
            >
              <p className="text-[10px] text-[var(--ink-muted)]">{STAGE_LABELS[stage]}</p>
              <p className="text-lg font-bold">{stageCounts[stage] ?? 0}</p>
            </div>
          ))}
        </div>
        <Link
          href={salesPathWithSearchParams("/platform/sales", searchParams)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:underline"
        >
          Go to pipeline <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-semibold">How to hit your targets</h3>
        <ul className="space-y-2 text-sm text-[var(--ink-muted)]">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            Add every shop you visit — even if they&apos;re not ready yet
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            Log a visit or call before moving to the next stage
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            Open each lead — the app shows exactly what to do next
          </li>
        </ul>
      </Card>
    </div>
  );
}
