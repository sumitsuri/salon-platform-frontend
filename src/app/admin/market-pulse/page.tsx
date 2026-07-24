"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Building2,
  Globe2,
  Lightbulb,
  MapPin,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { api, UpsertLocalCompetitorRequest } from "@/lib/api";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import {
  AllMetricsPanel,
  BranchRankTable,
  HeroComparisonTable,
  MarketPulseHero,
  NetworkPeersTable,
  PlaybookCard,
  PulseStatCard,
} from "@/components/market-pulse/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import {
  PageHeader,
  EmptyState,
  selectClass,
  btnPrimary,
  btnSecondary,
  AlertBanner,
  SegmentedControl,
  PageLoader,
} from "@/components/ui";
import { insightPeriodToRange, InsightPeriod } from "@/lib/insights-utils";

const PERIODS: InsightPeriod[] = ["days60", "month", "week"];

type Tab = "overview" | "branches" | "peers" | "local" | "playbook";

export default function MarketPulsePage() {
  const t = useTranslations("admin.marketPulse");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tPeriods = useTranslations("components.insights.periods");
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [period, setPeriod] = useState<InsightPeriod>("days60");
  const [initialized, setInitialized] = useState(false);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [compForm, setCompForm] = useState<UpsertLocalCompetitorRequest>({
    name: "",
    competitorType: "LOCAL",
  });

  const dateRange = insightPeriodToRange(period);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branches.length > 0 && !initialized) {
      setSelectedBranches(branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, initialized]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["benchmark", selectedBranches, period],
    queryFn: () =>
      api.getBenchmark({
        ...dateRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: settings } = useQuery({
    queryKey: ["benchmark-settings"],
    queryFn: () => api.getBenchmarkSettings(),
  });

  const addCompetitor = useMutation({
    mutationFn: () => api.createLocalCompetitor(compForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["benchmark"] });
      setShowAddCompetitor(false);
      setCompForm({ name: "", competitorType: "LOCAL" });
    },
  });

  const removeCompetitor = useMutation({
    mutationFn: (id: string) => api.deleteLocalCompetitor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["benchmark"] }),
  });

  const tabs = [
    { id: "overview" as const, label: t("tabs.overview"), icon: BarChart3 },
    { id: "branches" as const, label: t("tabs.branches"), icon: Building2 },
    { id: "peers" as const, label: t("tabs.peers"), icon: Globe2 },
    { id: "local" as const, label: t("tabs.local"), icon: MapPin },
    { id: "playbook" as const, label: t("tabs.playbook"), icon: Lightbulb },
  ];

  if (!initialized) {
    return <PageLoader label={tCommon("loading")} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={`${data?.brandName ?? ""} · ${data?.periodLabel ?? tPeriods(period)}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`}
        action={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as InsightPeriod)}
            className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[7rem]`}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {tPeriods(p)}
              </option>
            ))}
          </select>
        }
      />

      {!settings?.benchmarkOptIn && (
        <AlertBanner variant="warning">{t("optInHint")}</AlertBanner>
      )}

      <MissionStrip />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranches")} />
      ) : isLoading ? (
        <PageLoader label={t("loading")} />
      ) : data ? (
        <>
          <MarketPulseHero
            data={data}
            settingsCity={settings?.marketCity}
            onViewPlaybook={data.playbook.length > 0 ? () => setTab("playbook") : undefined}
            labels={{
              cohort: t("cohort"),
              brandRank: t("brandRank", { rank: data.brandRank ?? 0, size: data.cohortSize }),
              city: t("city"),
              metricsAboveMedian: t("metricsAboveMedian"),
              monthlyOpportunity: t("monthlyOpportunity"),
              viewActionPlan: t("viewActionPlan"),
              competitiveScore: t("competitiveScore"),
            }}
          />

          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <PulseStatCard
                  label={t("metricsAboveMedian")}
                  value={`${data.metricsAboveMedian}/${data.totalMetrics}`}
                  icon={Target}
                  accent="brand"
                  delay={50}
                />
                <PulseStatCard
                  label={t("monthlyOpportunity")}
                  value={`₹${Math.round(data.estimatedMonthlyOpportunity).toLocaleString("en-IN")}`}
                  icon={TrendingUp}
                  accent="emerald"
                  delay={100}
                />
                <PulseStatCard
                  label={t("networkPeers")}
                  value={data.cohortSize >= 3 ? data.cohortSize : "—"}
                  icon={Globe2}
                  accent="violet"
                  delay={150}
                />
                <PulseStatCard
                  label={t("localTracked")}
                  value={data.localCompetitors.length}
                  icon={MapPin}
                  accent="amber"
                  delay={200}
                />
              </div>

              <HeroComparisonTable
                metrics={data.heroMetrics}
                labels={{
                  title: t("heroMetrics"),
                  hint: t("heroMetricsHint"),
                  metric: t("metric"),
                  you: t("you"),
                  peerMedian: t("peerMedian"),
                  topQuartile: t("topQuartile"),
                  vsPeers: t("vsPeers"),
                  ahead: t("ahead"),
                  onPar: t("onPar"),
                  gap: (value) => t("gap", { value }),
                }}
              />

              <AllMetricsPanel
                metrics={data.allMetrics}
                title={t("allMetrics")}
                labels={{
                  metric: t("metric"),
                  you: t("you"),
                  peerMedian: t("peerMedian"),
                  topQuartile: t("topQuartile"),
                  percentile: t("percentile"),
                }}
              />
            </div>
          )}

          {tab === "branches" && (
            <BranchRankTable
              rows={data.branchRankings}
              labels={{
                branch: t("branch"),
                revPerDay: t("revPerDay"),
                atv: t("atv"),
                retail: t("retail"),
                margin: t("margin"),
                rank: t("rank"),
              }}
            />
          )}

          {tab === "peers" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)] px-0.5">{t("peersHint")}</p>
              <NetworkPeersTable
                peers={data.networkPeers}
                labels={{
                  peer: t("peer"),
                  branches: t("branches"),
                  revPerDay: t("revPerDay"),
                  atv: t("atv"),
                  retail: t("retail"),
                  margin: t("margin"),
                  you: t("you"),
                }}
              />
            </div>
          )}

          {tab === "local" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--text-secondary)]">{t("localHint")}</p>
                <button
                  type="button"
                  className={`${btnSecondary} text-sm`}
                  onClick={() => setShowAddCompetitor((v) => !v)}
                  disabled={(data.localCompetitors?.length ?? 0) >= 5}
                >
                  <Plus className="w-4 h-4" />
                  {t("addCompetitor")}
                </button>
              </div>

              {showAddCompetitor && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900 p-4 space-y-3 bg-amber-50/50 dark:bg-amber-950/20 mp-animate-in">
                  <input
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm bg-[var(--surface)]"
                    placeholder={t("competitorName")}
                    value={compForm.name}
                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(["revenuePerBranchDay", "avgTicket", "retailAttachPercent", "netMarginPercent", "repeatVisitRate"] as const).map(
                      (field) => (
                        <input
                          key={field}
                          type="number"
                          className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
                          placeholder={field}
                          onChange={(e) =>
                            setCompForm({
                              ...compForm,
                              [field]: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${btnPrimary} text-sm`}
                    disabled={!compForm.name || addCompetitor.isPending}
                    onClick={() => addCompetitor.mutate()}
                  >
                    {tCommon("save")}
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden responsive-table-wrap">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] bg-amber-50/50 dark:bg-amber-950/20 border-b border-[var(--border)]">
                      <th className="text-left py-3 pl-4 font-bold">{t("name")}</th>
                      <th className="text-left py-3 px-2">{t("type")}</th>
                      <th className="text-right py-3 px-2">{t("revPerDay")}</th>
                      <th className="text-right py-3 px-2">{t("atv")}</th>
                      <th className="text-right py-3 px-2">{t("retail")}</th>
                      <th className="text-right py-3 pr-4 pl-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.localCompetitors.map((c) => (
                      <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/30">
                        <td className="py-3 pl-4 font-semibold">{c.name}</td>
                        <td className="py-3 px-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-muted)] font-medium">{c.competitorType}</span>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums">
                          {c.revenuePerBranchDay != null ? `₹${Math.round(c.revenuePerBranchDay).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums">
                          {c.avgTicket != null ? `₹${Math.round(c.avgTicket).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums">
                          {c.retailAttachPercent != null ? `${c.retailAttachPercent}%` : "—"}
                        </td>
                        <td className="py-3 pr-4 pl-2 text-right">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-tertiary)] hover:text-red-600"
                            onClick={() => removeCompetitor.mutate(c.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "playbook" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">{t("playbookHint")}</p>
              {data.playbook.length === 0 ? (
                <EmptyState title={t("noPlaybookTitle")} description={t("noPlaybookDesc")} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.playbook.map((item) => (
                    <PlaybookCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
