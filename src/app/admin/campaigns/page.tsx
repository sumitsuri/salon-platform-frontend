"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Megaphone, Radio, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CampaignCreatePanel } from "@/components/campaign/CampaignCreatePanel";
import { CampaignDetailView } from "@/components/campaign/CampaignDetailView";
import { CampaignListSection } from "@/components/campaign/CampaignListSection";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { PageHeader, SideSheet } from "@/components/ui";

type View = "hub" | "create";

function useNarrowLayout() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return narrow;
}

export default function AdminCampaignsPage() {
  const t = useTranslations("admin.campaigns");
  const narrow = useNarrowLayout();
  const [view, setView] = useState<View>("hub");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createSubtitle, setCreateSubtitle] = useState("");
  const createSheetBackRef = useRef<() => void>(() => setView("hub"));

  const { data: messaging } = useQuery({
    queryKey: ["messaging-config"],
    queryFn: () => api.getMessagingConfig(),
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((c) => c.sendInProgress || c.status === "SENDING") ? 3000 : false,
  });

  const stats = useMemo(() => {
    const totalRuns = campaigns.reduce((sum, c) => sum + (c.runCount ?? 0), 0);
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount ?? 0), 0);
    const activeCampaigns = campaigns.filter((c) => c.status !== "ARCHIVED").length;
    return { totalRuns, totalSent, activeCampaigns };
  }, [campaigns]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);

  const openDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      setView("hub");
      setDetailOpen(narrow);
    },
    [narrow],
  );

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
  }, []);

  const handleCreated = useCallback(
    (id: string) => {
      setSelectedId(id);
      setView("hub");
      setDetailOpen(narrow);
    },
    [narrow],
  );

  const registerCreateSheetBack = useCallback((handler: () => void) => {
    createSheetBackRef.current = handler;
  }, []);

  return (
    <div className="dashboard-page-flow pb-8">
      <PageHeader title={t("title")} subtitle={t("heroDescription")} />

      {messaging ? (
        <div
          className={cn(
            "campaign-messaging-banner mb-4",
            !messaging.msg91Enabled && "campaign-messaging-banner--warn",
          )}
        >
          <span className="font-semibold">
            {messaging.msg91Enabled ? t("messagingStatusOk") : t("messagingStatusOff")}
          </span>
          {messaging.msg91Enabled ? (
            <>
              <span className="hidden sm:inline text-[var(--text-tertiary)]">·</span>
              <span className="hidden sm:inline">
                {t("messagingReady", {
                  billTemplate: messaging.billReceiptTemplate,
                  promoTemplate: messaging.promoTemplate,
                })}
              </span>
            </>
          ) : (
            <span>{t("messagingDisabled")}</span>
          )}
          <Link href="/admin/whatsapp-templates" className="ml-auto font-semibold text-[var(--brand-text)] shrink-0">
            {t("templatesLink")}
          </Link>
        </div>
      ) : null}

      <DashboardOverviewShell>
        <div className="dashboard-overview-modules dashboard-overview-modules--nested">
          <div className="dashboard-kpi-strip min-w-0 max-w-full">
            <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
              <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
                <Megaphone className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="dashboard-overview-section-title">{t("summaryLabel")}</h2>
                <p className="text-xs text-[var(--text-tertiary)]">{t("summaryHint")}</p>
              </div>
            </div>
            <CompactStatsStrip
              loading={isLoading}
              testId="campaigns-summary-strip"
              items={[
                {
                  id: "active",
                  label: t("statActiveCampaigns"),
                  value: isLoading ? "…" : String(stats.activeCampaigns),
                  icon: Sparkles,
                  accent: "violet",
                  featured: true,
                },
                {
                  id: "runs",
                  label: t("statTotalRuns"),
                  value: isLoading ? "…" : String(stats.totalRuns),
                  icon: Radio,
                  accent: "sky",
                },
                {
                  id: "sent",
                  label: t("statMessagesSent"),
                  value: isLoading ? "…" : String(stats.totalSent),
                  icon: Send,
                  accent: "emerald",
                },
              ]}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <CampaignListSection
              campaigns={campaigns}
              loading={isLoading}
              selectedId={selectedId}
              onSelect={openDetail}
              onCreate={() => setView("create")}
            />

            <div className="hidden xl:block min-w-0">
              {view === "create" ? (
                <CampaignCreatePanel
                  onBack={() => setView("hub")}
                  onCreated={handleCreated}
                  messagingReady={!!messaging?.msg91Enabled}
                />
              ) : selectedId ? (
                <CampaignDetailView
                  campaignId={selectedId}
                  messagingReady={!!messaging?.msg91Enabled}
                  onDeleted={() => {
                    setSelectedId(null);
                    setDetailOpen(false);
                  }}
                />
              ) : (
                <div className="dashboard-widget-card flex flex-col items-center justify-center min-h-[280px] text-center p-8">
                  <Megaphone className="w-10 h-10 text-[var(--text-tertiary)] mb-3 opacity-40" />
                  <p className="font-semibold text-[var(--text-primary)]">{t("selectCampaignTitle")}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">{t("selectCampaignDesc")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardOverviewShell>

      <SideSheet
        open={view === "create" && narrow}
        onClose={() => setView("hub")}
        onBack={() => createSheetBackRef.current()}
        backLabel={t("backToCampaigns")}
        wide
        title={t("createCampaignTitle")}
        subtitle={createSubtitle || t("createCampaignSubtitle")}
      >
        <CampaignCreatePanel
          embedded
          onBack={() => setView("hub")}
          onCreated={handleCreated}
          messagingReady={!!messaging?.msg91Enabled}
          onStepMetaChange={({ subtitle }) => setCreateSubtitle(subtitle)}
          onRegisterSheetBack={registerCreateSheetBack}
        />
      </SideSheet>

      <SideSheet
        open={detailOpen && !!selectedId}
        onClose={closeDetail}
        onBack={closeDetail}
        backLabel={t("backToCampaigns")}
        wide
        title={selectedCampaign?.name ?? t("title")}
        subtitle={
          selectedCampaign
            ? `${selectedCampaign.channel === "WHATSAPP" ? t("whatsapp") : t("sms")} · ${t("openCampaignDetail")}`
            : undefined
        }
      >
        {selectedId ? (
          <CampaignDetailView
            campaignId={selectedId}
            messagingReady={!!messaging?.msg91Enabled}
            embedded
            onDeleted={() => {
              closeDetail();
              setSelectedId(null);
            }}
          />
        ) : null}
      </SideSheet>
    </div>
  );
}
