"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronDown, Eye, EyeOff, History, RefreshCw, Send, Trash2, Users } from "lucide-react";
import { api, type Campaign, type CampaignRun } from "@/lib/api";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { buildCriteriaFromCampaign } from "@/lib/campaign-filter-summary";
import { CampaignAudiencePreview } from "@/components/campaign/CampaignAudiencePreview";
import { CampaignCriteriaSummary } from "@/components/campaign/CampaignCriteriaSummary";
import { CampaignWhatsAppMessagePreview, CampaignWhatsAppStatusStrip } from "@/components/campaign/CampaignWhatsAppSection";
import { useClientInfiniteList } from "@/lib/use-client-infinite-list";
import { cn } from "@/lib/utils";
import {
  btnPrimary,
  btnSecondary,
  btnSecondarySm,
  ConfirmDialog,
  EmptyState,
  InfiniteScrollFooter,
  InfiniteScrollViewport,
  PageLoader,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";
import { DashboardWidgetCard } from "@/components/enterprise-ui";

type DetailTab = "send" | "audience" | "history";

export function CampaignDetailView({
  campaignId,
  messagingReady,
  embedded = false,
  onDeleted,
}: {
  campaignId: string;
  messagingReady: boolean;
  embedded?: boolean;
  onDeleted?: () => void;
}) {
  const t = useTranslations("admin.campaigns");
  const tCommon = useTranslations("common");
  const localeKit = getTenantLocaleKit();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>("send");
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showMessagePreview, setShowMessagePreview] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => api.getCampaign(campaignId),
    refetchInterval: (q) => (q.state.data?.sendInProgress ? 3000 : false),
  });

  const { data: templateLibrary } = useQuery({
    queryKey: ["campaign-template-library"],
    queryFn: () => api.getCampaignTemplateLibrary(),
    staleTime: 10 * 60_000,
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  const { data: catalogServices } = useQuery({
    queryKey: ["catalog-services-campaign-detail"],
    queryFn: () => api.getCatalogServices(),
  });

  const { data: catalogCategories } = useQuery({
    queryKey: ["catalog-categories-campaign-detail"],
    queryFn: () => api.getCategories(),
  });

  const { data: preview, isFetching: previewLoading, refetch: refetchPreview } = useQuery({
    queryKey: ["campaign-preview", campaignId],
    queryFn: () => api.previewSavedCampaign(campaignId),
    enabled: !!campaignId,
    refetchInterval: 60_000,
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["campaign-runs", campaignId],
    queryFn: () => api.getCampaignRuns(campaignId),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r: CampaignRun) => r.status === "SENDING") ? 3000 : false,
  });

  const send = useMutation({
    mutationFn: () => api.sendCampaign(campaignId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-runs", campaignId] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-preview", campaignId] });
      setSendConfirmOpen(false);
      setActiveTab("history");
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteCampaign(campaignId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.removeQueries({ queryKey: ["campaign", campaignId] });
      setDeleteConfirmOpen(false);
      setDeleteError("");
      onDeleted?.();
    },
    onError: (e: Error) => setDeleteError(e.message),
  });

  const growthTemplate = useMemo(() => {
    if (!campaign?.templateId || !templateLibrary) return undefined;
    return templateLibrary.categories.flatMap((c) => c.templates).find((tpl) => tpl.id === campaign.templateId);
  }, [campaign?.templateId, templateLibrary]);

  const criteriaItems = useMemo(() => {
    if (!campaign) return [];
    const serviceLabels = Object.fromEntries(
      (catalogServices ?? []).filter((s) => s.active).map((s) => [s.id, s.name]),
    );
    const categoryLabels = Object.fromEntries(
      (catalogCategories ?? []).filter((c) => c.active).map((c) => [c.id, c.name]),
    );
    return buildCriteriaFromCampaign(campaign, {
      branchLabel: branches?.find((b) => b.id === campaign.filterBranchId)?.name,
      serviceLabels,
      categoryLabels,
    });
  }, [campaign, branches, catalogServices, catalogCategories]);

  if (isLoading || !campaign) {
    return <PageLoader label={tCommon("loading")} />;
  }

  const matchCount = preview?.matchingCustomers ?? 0;
  const fromTemplate = !!campaign.templateId;
  const canSend =
    messagingReady &&
    !campaign.sendInProgress &&
    !send.isPending &&
    matchCount > 0 &&
    campaign.status !== "ARCHIVED";

  const sendDisabledReason = !messagingReady
    ? t("sendDisabledMessaging")
    : campaign.sendInProgress || send.isPending
      ? t("sending")
      : matchCount <= 0
        ? t("zeroCohortHint")
        : campaign.status === "ARCHIVED"
          ? t("sendDisabledArchived")
          : null;

  const tabOptions = [
    { id: "send" as const, label: t("detailTabSend"), icon: Send },
    { id: "audience" as const, label: t("detailTabAudience"), icon: Users },
    { id: "history" as const, label: t("detailTabHistory"), icon: History },
  ];

  const sendActions = (
    <div className="campaign-detail-actions">
      {showMessagePreview && campaign.channel === "WHATSAPP" ? (
        <div className="campaign-preview-dock campaign-preview-dock--inline">
          <CampaignWhatsAppMessagePreview offerText={campaign.messageText} active />
        </div>
      ) : null}

      <div className="campaign-detail-cohort-row">
        <div className="campaign-create-cohort-chip min-w-0 flex-1">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {previewLoading ? t("counting") : t("customersMatch", { count: matchCount })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetchPreview()}
          className={cn(btnSecondary, "shrink-0 px-3")}
          aria-label={t("refreshCohort")}
        >
          <RefreshCw className={cn("w-4 h-4", previewLoading && "animate-spin")} />
        </button>
      </div>

      {campaign.channel === "WHATSAPP" ? (
        <button type="button" onClick={() => setShowMessagePreview((v) => !v)} className={btnSecondary}>
          {showMessagePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showMessagePreview ? t("hideMessagePreview") : t("previewMessage")}
        </button>
      ) : null}

      <button
        type="button"
        disabled={!canSend}
        onClick={() => setSendConfirmOpen(true)}
        className={cn(btnPrimary, "w-full")}
        title={sendDisabledReason ?? undefined}
      >
        <Send className="w-4 h-4 shrink-0" />
        {send.isPending || campaign.sendInProgress ? t("sending") : t("sendNow")}
      </button>
    </div>
  );

  const body = (
    <div className={cn("campaign-detail-shell min-w-0", embedded && "campaign-detail-shell--embedded")}>
      {!embedded ? (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{campaign.name}</h2>
            <StatusBadge status={campaign.sendInProgress ? "SENDING" : campaign.status} />
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError("");
              setDeleteConfirmOpen(true);
            }}
            disabled={campaign.sendInProgress || remove.isPending}
            className={cn(btnSecondarySm, "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30")}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("deleteCampaign")}
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setDeleteError("");
              setDeleteConfirmOpen(true);
            }}
            disabled={campaign.sendInProgress || remove.isPending}
            className={cn(btnSecondarySm, "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30")}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("deleteCampaign")}
          </button>
        </div>
      )}

      <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />

      {activeTab === "send" && (
        <div className="space-y-3">
          {campaign.channel === "WHATSAPP" ? (
            <>
              <CampaignWhatsAppStatusStrip messagingReady={messagingReady} />
              <div className="campaign-detail-message-preview">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                  {t("messagePreview")}
                </p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-4">
                  {campaign.messageText}
                </p>
              </div>
            </>
          ) : (
            <div className="campaign-detail-message-preview">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                {t("messagePreview")}
              </p>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{campaign.messageText}</p>
            </div>
          )}

          {!canSend && sendDisabledReason ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">{sendDisabledReason}</p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {sendActions}
        </div>
      )}

      {activeTab === "audience" && (
        <div className="space-y-4">
          {fromTemplate ? (
            <CampaignCriteriaSummary
              templateName={growthTemplate?.name ?? campaign.name}
              templateGoal={growthTemplate?.goal}
              criteria={criteriaItems}
            />
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">{t("liveCohortHint")}</p>
          )}

          {preview && preview.customers.length > 0 ? (
            <CampaignAudiencePreview
              customers={preview.customers}
              totalCount={preview.matchingCustomers}
              truncated={preview.previewTruncated}
              channel={campaign.channel}
              variant="plain"
            />
          ) : (
            <EmptyState title={t("previewAudienceEmpty")} description={t("previewAudienceEmptyDesc")} />
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-tertiary)]">{t("runsSubtitle")}</p>
          {runsLoading ? (
            <PageLoader label={t("loadingRuns")} />
          ) : runs.length === 0 ? (
            <EmptyState title={t("runsEmptyTitle")} description={t("runsEmptyDesc")} />
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  campaign={campaign}
                  expanded={expandedRunId === run.id}
                  onToggle={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                  localeKit={localeKit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? body : <DashboardWidgetCard><div className="p-4 sm:p-5">{body}</div></DashboardWidgetCard>}

      <ConfirmDialog
        open={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        onConfirm={() => send.mutate()}
        title={t("sendConfirmTitle")}
        description={t("sendConfirmBody", {
          name: campaign.name,
          count: matchCount,
          channel: campaign.channel === "WHATSAPP" ? t("whatsapp") : t("sms"),
        })}
        confirmLabel={send.isPending ? t("sending") : t("sendConfirmAction")}
        confirmPending={send.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!remove.isPending) {
            setDeleteConfirmOpen(false);
            setDeleteError("");
          }
        }}
        onConfirm={() => remove.mutate()}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmBody", { name: campaign.name })}
        confirmLabel={remove.isPending ? t("deleting") : t("deleteConfirmAction")}
        confirmPending={remove.isPending}
        error={deleteError || undefined}
      />
    </>
  );
}

function RunRow({
  run,
  campaign,
  expanded,
  onToggle,
  localeKit,
}: {
  run: CampaignRun;
  campaign: Campaign;
  expanded: boolean;
  onToggle: () => void;
  localeKit: ReturnType<typeof getTenantLocaleKit>;
}) {
  const t = useTranslations("admin.campaigns");

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["campaign-run-deliveries", campaign.id, run.id],
    queryFn: () => api.getCampaignRunDeliveries(campaign.id, run.id),
    enabled: expanded,
  });
  const {
    visible: visibleDeliveries,
    totalElements: deliveryTotal,
    loadedCount,
    hasMore,
    loadMore,
  } = useClientInfiniteList(deliveries);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-secondary)] transition-colors touch-manipulation"
      >
        <ChevronDown
          className={cn("w-4 h-4 shrink-0 text-[var(--text-tertiary)] transition-transform", expanded && "rotate-180")}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {run.startedAt ? formatTenantDateTime(run.startedAt, localeKit) : "—"}
          </p>
          <p className="text-xs text-[var(--text-secondary)] tabular-nums">
            {t("campaignResult", {
              sent: run.sentCount,
              failed: run.failedCount,
              total: run.recipientCount,
            })}
          </p>
        </div>
        <StatusBadge status={run.status === "SENDING" ? "SENDING" : run.status} />
      </button>
      {expanded ? (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 bg-[var(--surface-secondary)]">
          {isLoading ? (
            <PageLoader label={t("loadingRunCustomers")} />
          ) : deliveries.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">{t("runCustomersEmpty")}</p>
          ) : (
            <InfiniteScrollViewport>
              <ul className="space-y-2">
                {visibleDeliveries.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{d.customerName || "—"}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--text-tertiary)]">{d.recipientPhone}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  </li>
                ))}
              </ul>
              <InfiniteScrollFooter
                totalElements={deliveryTotal}
                loadedCount={loadedCount}
                hasMore={hasMore}
                isFetchingNextPage={false}
                onLoadMore={loadMore}
              />
            </InfiniteScrollViewport>
          )}
        </div>
      ) : null}
    </div>
  );
}
