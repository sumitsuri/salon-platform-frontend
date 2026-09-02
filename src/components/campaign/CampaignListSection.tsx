"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Megaphone, Plus, Users } from "lucide-react";
import type { Campaign } from "@/lib/api";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { cn } from "@/lib/utils";
import { DataListPanel } from "@/components/DataListPanel";
import { btnPrimary, EmptyState, PageLoader, StatusBadge } from "@/components/ui";

export function CampaignListSection({
  campaigns,
  loading,
  selectedId,
  onSelect,
  onCreate,
}: {
  campaigns: Campaign[];
  loading: boolean;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("admin.campaigns");
  const localeKit = getTenantLocaleKit();

  const sorted = useMemo(
    () => [...campaigns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [campaigns],
  );

  return (
    <DataListPanel
      id="campaigns-list"
      testId="campaigns-list"
      icon={Megaphone}
      title={t("listTitle")}
      hint={loading ? t("loading") : t("listSubtitle")}
      toolbarEnd={
        <button type="button" onClick={onCreate} className={btnPrimary}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("newCampaign")}</span>
          <span className="sm:hidden">{t("newCampaign")}</span>
        </button>
      }
    >
      {loading ? (
        <PageLoader label={t("loading")} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <button type="button" onClick={onCreate} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              {t("newCampaign")}
            </button>
          }
        />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {sorted.map((c) => {
            const selected = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn("campaign-list-row", selected && "campaign-list-row--selected")}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-[var(--text-primary)] truncate pr-2">{c.name}</p>
                      <StatusBadge status={c.sendInProgress ? "SENDING" : c.status} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{c.messageText}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                      <span>{c.channel === "WHATSAPP" ? t("whatsapp") : t("sms")}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {t("runCountLabel", { count: c.runCount ?? 0 })}
                      </span>
                      {c.lastRunAt ? (
                        <span>{formatTenantDateTime(c.lastRunAt, localeKit)}</span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-tertiary)] mt-0.5 xl:hidden" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </DataListPanel>
  );
}
