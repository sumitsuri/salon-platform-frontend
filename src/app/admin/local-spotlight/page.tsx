"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Building2,
  Lightbulb,
  MapPin,
  Phone,
  RefreshCw,
  ScanSearch,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  api,
  LocalSpotlightBranchRow,
  UpdateBranchDigitalPresenceRequest,
  UpsertLocalCompetitorRequest,
} from "@/lib/api";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import {
  BranchGbpChecklist,
  BranchSpotlightTable,
  LocalSpotlightHero,
  PulseStatCard,
  RivalsComparisonTable,
  SearchRankTable,
  SpotlightActionPlan,
} from "@/components/local-spotlight/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import {
  PageHeader,
  EmptyState,
  selectClass,
  btnPrimary,
  btnSecondary,
  SegmentedControl,
  PageLoader,
  SideSheet,
  inputClass,
  AlertBanner,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type Tab = "overview" | "branches" | "rivals" | "search" | "playbook";
type StatFilter = "all" | "notTop3" | "ratingBelow" | "incomplete" | "noPhone";

export default function LocalSpotlightPage() {
  const t = useTranslations("admin.localSpotlight");
  const tOrg = useTranslations("admin.organization");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(2);
  const [initialized, setInitialized] = useState(false);
  const [statFilter, setStatFilter] = useState<StatFilter>("all");
  const [detailBranch, setDetailBranch] = useState<LocalSpotlightBranchRow | null>(null);
  const [editDigital, setEditDigital] = useState(false);
  const [digitalForm, setDigitalForm] = useState<UpdateBranchDigitalPresenceRequest>({});
  const [showAddRival, setShowAddRival] = useState(false);
  const [rivalForm, setRivalForm] = useState<UpsertLocalCompetitorRequest>({
    name: "",
    competitorType: "LOCAL",
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branches.length > 0 && !initialized) {
      const pilot = branches.find((b) => b.code === "VAR") ?? branches[0];
      setSelectedBranches(pilot ? [pilot.id] : branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, initialized]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["local-spotlight", selectedBranches, radiusKm],
    queryFn: () =>
      api.getLocalSpotlight({
        radiusKm,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const syncGoogle = useMutation({
    mutationFn: () => api.syncLocalSpotlight({ radiusKm, force: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-spotlight"] });
    },
  });

  const saveDigital = useMutation({
    mutationFn: () => {
      if (!detailBranch) throw new Error("No branch");
      return api.updateBranchDigitalPresence(detailBranch.branchId, digitalForm);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-spotlight"] });
      qc.invalidateQueries({ queryKey: ["branches"] });
      setEditDigital(false);
    },
  });

  const addRival = useMutation({
    mutationFn: () => api.createLocalCompetitor(rivalForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-spotlight"] });
      qc.invalidateQueries({ queryKey: ["benchmark"] });
      setShowAddRival(false);
      setRivalForm({ name: "", competitorType: "LOCAL" });
    },
  });

  const filteredBranchRows = useMemo(() => {
    const rows = data?.branches ?? [];
    switch (statFilter) {
      case "notTop3":
        return rows.filter((r) => r.listingLinked && !r.inTop3);
      case "ratingBelow":
        return rows.filter((r) => r.listingLinked && (r.googleRating ?? 0) < 4.2);
      case "incomplete":
        return rows.filter((r) => r.listingLinked && r.gbpCompletenessPercent < 70);
      case "noPhone":
        return rows.filter((r) => r.listingLinked && !r.gbpHasPhone);
      default:
        return rows;
    }
  }, [data?.branches, statFilter]);

  const tabs = [
    { id: "overview" as const, label: t("tabs.overview"), icon: BarChart3 },
    { id: "branches" as const, label: t("tabs.branches"), icon: Building2 },
    { id: "rivals" as const, label: t("tabs.rivals"), icon: Users },
    { id: "search" as const, label: t("tabs.search"), icon: ScanSearch },
    { id: "playbook" as const, label: t("tabs.playbook"), icon: Lightbulb },
  ];

  const pilotBranchRow = data?.branches.find((b) => b.pilotBranch);
  const syncedBranch = data?.branches.find((b) => b.googleSynced) ?? data?.branches[0];
  const searchHint =
    syncedBranch?.businessType === "SPA"
      ? t("searchHintSpa")
      : syncedBranch?.businessType === "SALON_AND_SPA"
        ? t("searchHintSalonAndSpa")
        : t("searchHint");
  const showPilotReadOnly = !!data?.pilotMode;

  function openBranchDetail(row: LocalSpotlightBranchRow) {
    setDetailBranch(row);
    setEditDigital(false);
    setDigitalForm({
      googleMapsUrl: row.googleMapsUrl ?? "",
      googleReviewUrl: row.googleReviewUrl ?? "",
      googleReviewAutoPublish: row.googleReviewAutoPublish ?? true,
      googleRating: row.googleRating ?? undefined,
      googleReviewCount: row.googleReviewCount ?? undefined,
      gbpPhotoCount: row.gbpPhotoCount ?? undefined,
      gbpVideoCount: row.gbpVideoCount ?? undefined,
      gbpHasPhone: row.gbpHasPhone,
      gbpHasWebsite: row.gbpHasWebsite,
      gbpHasHours: row.gbpHasHours,
      gbpHasBookButton: row.gbpHasBookButton,
      gbpServicesListedCount: row.gbpServicesListedCount ?? undefined,
      estimatedSearchRank: row.estimatedSearchRank ?? undefined,
    });
    setTab("branches");
  }

  if (!initialized) {
    return <PageLoader label={tCommon("loading")} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={syncGoogle.isPending || data?.googleApiConfigured === false}
              onClick={() => syncGoogle.mutate()}
            >
              <RefreshCw className={cn("mr-2 inline h-4 w-4", syncGoogle.isPending && "animate-spin")} />
              {t("refreshFromGoogle")}
            </button>
            <select
              className={selectClass}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              aria-label={t("radius")}
            >
              <option value={1}>{t("radius1km")}</option>
              <option value={2}>{t("radius2km")}</option>
              <option value={5}>{t("radius5km")}</option>
            </select>
          </div>
        }
      />

      <MissionStrip />
      <p className="text-sm text-[var(--text-secondary)]">{t("missionDescription")}</p>

      {data?.pilotMode && (
        <AlertBanner variant="info">
          {t("pilotBanner", {
            branch: data.pilotBranchName ?? data.pilotBranchCode ?? "VAR",
          })}
        </AlertBanner>
      )}

      {!data?.googleApiConfigured && (
        <AlertBanner variant="warning">{t("googleApiMissing")}</AlertBanner>
      )}

      {syncGoogle.data?.message && (
        <AlertBanner variant={syncGoogle.data.skipped ? "info" : "success"}>
          {syncGoogle.data.message}
          {syncGoogle.data.googleMapsUrl && (
            <>
              {" "}
              <a href={syncGoogle.data.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                {t("viewGoogleListing")}
              </a>
            </>
          )}
        </AlertBanner>
      )}

      {data?.syncStatusMessage && !syncGoogle.data && (
        <AlertBanner variant="info">{data.syncStatusMessage}</AlertBanner>
      )}

      <BranchMultiSelect
        branches={branches}
        selected={selectedBranches}
        onChange={setSelectedBranches}
      />

      {isLoading ? (
        <PageLoader label={t("loading")} />
      ) : !data ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <>
          <LocalSpotlightHero
            score={data.localVisibilityScore}
            scoreLabel={data.scoreLabel}
            branchesLinked={data.branchesLinked}
            branchesTotal={data.branchesTotal}
            dataSourceNote={data.dataSourceNote}
            lastRefreshedAt={data.lastRefreshedAt}
            t={t}
          />

          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button type="button" className="text-left w-full" onClick={() => { setStatFilter("notTop3"); setTab("branches"); }}>
                  <PulseStatCard label={t("statNotTop3")} value={String(data.notInTop3Count)} icon={ScanSearch} accent="amber" />
                </button>
                <button type="button" className="text-left w-full" onClick={() => { setStatFilter("ratingBelow"); setTab("branches"); }}>
                  <PulseStatCard label={t("statRatingBelow")} value={String(data.ratingBelowRivalsCount)} icon={Star} accent="amber" />
                </button>
                <button type="button" className="text-left w-full" onClick={() => { setStatFilter("incomplete"); setTab("branches"); }}>
                  <PulseStatCard label={t("statIncompleteGbp")} value={String(data.incompleteGbpCount)} icon={Building2} accent="violet" />
                </button>
                <button type="button" className="text-left w-full" onClick={() => { setStatFilter("noPhone"); setTab("branches"); }}>
                  <PulseStatCard label={t("statNoPhone")} value={String(data.missingPhoneCount)} icon={Phone} accent="emerald" />
                </button>
              </div>

              {data.branchesLinked < data.branchesTotal && !showPilotReadOnly && (
                <AlertBanner variant="warning">
                  {t("linkPrompt")}{" "}
                  <Link href="/admin/branches" className="font-semibold underline">
                    {t("linkPromptAction")}
                  </Link>
                </AlertBanner>
              )}

              {showPilotReadOnly && pilotBranchRow && !pilotBranchRow.googleSynced && (
                <AlertBanner variant="warning">{t("syncRequired")}</AlertBanner>
              )}

              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">{t("branchLeaderboard")}</h3>
                <BranchSpotlightTable
                  rows={data.branches}
                  t={t}
                  onSelectBranch={(id) => {
                    const row = data.branches.find((b) => b.branchId === id);
                    if (row) openBranchDetail(row);
                  }}
                />
              </div>

              {data.playbook.length > 0 && (
                <div className="space-y-2">
                  <SpotlightActionPlan
                    items={data.playbook}
                    t={t}
                    branch={syncedBranch}
                    searchRanks={data.searchRanks}
                    onTabChange={(next) => setTab(next as Tab)}
                    onOpenBranch={() => syncedBranch && openBranchDetail(syncedBranch)}
                    onSyncGoogle={() => syncGoogle.mutate()}
                    limit={4}
                    title={t("topActions")}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--brand-text)] hover:underline"
                      onClick={() => setTab("playbook")}
                    >
                      {t("viewAllActions")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "branches" && (
            <div className="space-y-4">
              {statFilter !== "all" && (
                <button type="button" className={btnSecondary} onClick={() => setStatFilter("all")}>
                  {t("clearFilter")}
                </button>
              )}
              <BranchSpotlightTable rows={filteredBranchRows} t={t} onSelectBranch={(id) => {
                const row = data.branches.find((b) => b.branchId === id);
                if (row) openBranchDetail(row);
              }} />
            </div>
          )}

          {tab === "rivals" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {showPilotReadOnly ? t("rivalsFromGoogle") : t("rivalsHint")}
              </p>
              {!showPilotReadOnly && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnPrimary} onClick={() => setShowAddRival(true)}>
                    {t("addRival")}
                  </button>
                  <Link href="/admin/market-pulse" className={btnSecondary}>
                    {t("manageInMarketPulse")}
                  </Link>
                </div>
              )}
              <RivalsComparisonTable branches={data.branches} rivals={data.rivals} t={t} />
            </div>
          )}

          {tab === "search" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-[var(--text-secondary)]">{searchHint}</p>
                {syncedBranch?.businessType && (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {t("searchKeywordsFor", {
                      type: tOrg(`businessTypes.${syncedBranch.businessType}`),
                    })}
                  </p>
                )}
              </div>
              <SearchRankTable rows={data.searchRanks} t={t} />
            </div>
          )}

          {tab === "playbook" && (
            <div>
              {data.playbook.length === 0 ? (
                <EmptyState title={t("noPlaybookTitle")} description={t("noPlaybookDesc")} />
              ) : (
                <SpotlightActionPlan
                  items={data.playbook}
                  t={t}
                  branch={syncedBranch}
                  searchRanks={data.searchRanks}
                  onTabChange={(next) => setTab(next as Tab)}
                  onOpenBranch={() => syncedBranch && openBranchDetail(syncedBranch)}
                  onSyncGoogle={() => syncGoogle.mutate()}
                />
              )}
            </div>
          )}
        </>
      )}

      {isFetching && !isLoading && (
        <p className="text-xs text-[var(--text-tertiary)]">{tCommon("loading")}</p>
      )}

      <SideSheet
        open={!!detailBranch}
        onClose={() => setDetailBranch(null)}
        title={detailBranch?.branchName ?? ""}
      >
        {detailBranch && (
          <div className="space-y-4">
            {!editDigital || showPilotReadOnly ? (
              <>
                <BranchGbpChecklist row={detailBranch} t={t} />
                {!showPilotReadOnly && (
                  <button type="button" className={btnPrimary} onClick={() => setEditDigital(true)}>
                    {t("editDigitalPresence")}
                  </button>
                )}
                {showPilotReadOnly && (
                  <p className="text-xs text-[var(--text-tertiary)]">{t("pilotReadOnly")}</p>
                )}
              </>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveDigital.mutate();
                }}
              >
                <label className="block text-xs font-semibold">{t("googleMapsUrl")}</label>
                <input className={inputClass} value={digitalForm.googleMapsUrl ?? ""} onChange={(e) => setDigitalForm({ ...digitalForm, googleMapsUrl: e.target.value })} />
                <label className="block text-xs font-semibold">{t("googleReviewUrl")}</label>
                <input className={inputClass} value={digitalForm.googleReviewUrl ?? ""} onChange={(e) => setDigitalForm({ ...digitalForm, googleReviewUrl: e.target.value })} />
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={digitalForm.googleReviewAutoPublish ?? true}
                    onChange={(e) => setDigitalForm({ ...digitalForm, googleReviewAutoPublish: e.target.checked })}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-xs font-semibold">{t("googleReviewAutoPublish")}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">{t("googleReviewAutoPublishHint")}</span>
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold">{t("googleRating")}</label>
                    <input type="number" step="0.1" min={1} max={5} className={inputClass} value={digitalForm.googleRating ?? ""} onChange={(e) => setDigitalForm({ ...digitalForm, googleRating: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">{t("googleReviewCount")}</label>
                    <input type="number" className={inputClass} value={digitalForm.googleReviewCount ?? ""} onChange={(e) => setDigitalForm({ ...digitalForm, googleReviewCount: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">{t("searchRank")}</label>
                    <input type="number" min={1} className={inputClass} value={digitalForm.estimatedSearchRank ?? ""} onChange={(e) => setDigitalForm({ ...digitalForm, estimatedSearchRank: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">{t("photos")}</label>
                    <input type="number" className={inputClass} value={digitalForm.gbpPhotoCount ?? ""} onChange={(e) => setDigitalForm({ ...digitalForm, gbpPhotoCount: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(["gbpHasPhone", "gbpHasWebsite", "gbpHasHours", "gbpHasBookButton"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input type="checkbox" checked={!!digitalForm[key]} onChange={(e) => setDigitalForm({ ...digitalForm, [key]: e.target.checked })} />
                      {t(key)}
                    </label>
                  ))}
                </div>
                {saveDigital.error && <AlertBanner variant="error">{(saveDigital.error as Error).message}</AlertBanner>}
                <div className="flex gap-2">
                  <button type="submit" className={`${btnPrimary} flex-1`} disabled={saveDigital.isPending}>{tCommon("save")}</button>
                  <button type="button" className={btnSecondary} onClick={() => setEditDigital(false)}>{tCommon("cancel")}</button>
                </div>
              </form>
            )}
          </div>
        )}
      </SideSheet>

      <SideSheet open={showAddRival} onClose={() => setShowAddRival(false)} title={t("addRival")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addRival.mutate();
          }}
        >
          <label className="block text-xs font-semibold">{t("rivalName")}</label>
          <input className={inputClass} required value={rivalForm.name} onChange={(e) => setRivalForm({ ...rivalForm, name: e.target.value })} />
          <label className="block text-xs font-semibold">{t("googleRating")}</label>
          <input type="number" step="0.1" className={inputClass} value={rivalForm.googleRating ?? ""} onChange={(e) => setRivalForm({ ...rivalForm, googleRating: e.target.value ? Number(e.target.value) : undefined })} />
          <label className="block text-xs font-semibold">{t("googleReviewCount")}</label>
          <input type="number" className={inputClass} value={rivalForm.googleReviewCount ?? ""} onChange={(e) => setRivalForm({ ...rivalForm, googleReviewCount: e.target.value ? Number(e.target.value) : undefined })} />
          <label className="block text-xs font-semibold">{t("searchRank")}</label>
          <input type="number" className={inputClass} value={rivalForm.estimatedSearchRank ?? ""} onChange={(e) => setRivalForm({ ...rivalForm, estimatedSearchRank: e.target.value ? Number(e.target.value) : undefined })} />
          <button type="submit" className={btnPrimary} disabled={addRival.isPending}>{t("addRival")}</button>
        </form>
      </SideSheet>
    </div>
  );
}
