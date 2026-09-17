"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gift, Plus, Sparkles } from "lucide-react";
import {
  api,
  type CreateScratchCampaignRequest,
  type ScratchCampaign,
  type ScratchCampaignPrize,
} from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import {
  PageHeader,
  EmptyState,
  PageLoader,
  btnPrimarySm,
  btnSecondarySm,
  StatusBadge,
} from "@/components/ui";

function defaultPrizes(): ScratchCampaignPrize[] {
  return [
    {
      label: "20% off premium service",
      prizeKind: "PERCENT_OFF",
      discountType: "PERCENT",
      discountValue: 20,
      weight: 15,
    },
    {
      label: "₹150 off today",
      prizeKind: "FLAT_OFF",
      discountType: "FLAT",
      discountValue: 150,
      weight: 25,
    },
    {
      label: "Complimentary add-on service",
      prizeKind: "COMPLIMENTARY_SERVICE",
      weight: 10,
    },
    {
      label: "Better luck next visit",
      prizeKind: "TRY_AGAIN",
      weight: 50,
    },
  ];
}

function prizeSummary(prize: ScratchCampaignPrize) {
  if (prize.prizeKind === "PERCENT_OFF") return `${prize.discountValue}% off`;
  if (prize.prizeKind === "FLAT_OFF") return formatCurrency(prize.discountValue ?? 0);
  if (prize.prizeKind === "COMPLIMENTARY_SERVICE") return "Complimentary";
  return "No prize";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminScratchCardsPage() {
  const t = useTranslations("admin.scratchCards");
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("Visit Surprise Scratch");
  const [description, setDescription] = useState(
    "Give guests a scratch card each visit. Rewards apply across all branches after they share mobile for redemption."
  );
  const [prizes, setPrizes] = useState<ScratchCampaignPrize[]>(defaultPrizes);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["scratch-campaigns"],
    queryFn: () => api.getScratchCampaigns(),
  });

  const create = useMutation({
    mutationFn: (payload: CreateScratchCampaignRequest) => api.createScratchCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scratch-campaigns"] });
      setSheetOpen(false);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "PAUSED" }) =>
      api.updateScratchCampaignStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scratch-campaigns"] }),
  });

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "ACTIVE").length;
    const issued = campaigns.reduce((s, c) => s + (c.cardsIssued ?? 0), 0);
    const redeemed = campaigns.reduce((s, c) => s + (c.cardsRedeemed ?? 0), 0);
    return { active, issued, redeemed, total: campaigns.length };
  }, [campaigns]);

  function submitCreate() {
    const now = new Date();
    const startsAt = now.toISOString();
    const ends = new Date(now);
    ends.setMonth(ends.getMonth() + 6);
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      startsAt,
      endsAt: ends.toISOString(),
      cardsValidDays: 14,
      status: "ACTIVE",
      prizes,
    });
  }

  function updatePrizeWeight(index: number, weight: number) {
    setPrizes((rows) => rows.map((p, i) => (i === index ? { ...p, weight } : p)));
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="dashboard-page-flow space-y-4">
      <DashboardOverviewShell>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          action={
            <button type="button" className={btnPrimarySm} onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("create")}
            </button>
          }
        />
        <CompactStatsStrip
          items={[
            { id: "active", label: t("statsActive"), value: String(stats.active) },
            { id: "issued", label: t("statsIssued"), value: String(stats.issued) },
            { id: "redeemed", label: t("statsRedeemed"), value: String(stats.redeemed) },
          ]}
        />
      </DashboardOverviewShell>

      {campaigns.length === 0 ? (
        <EmptyState icon={Gift} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onPause={() =>
                toggleStatus.mutate({
                  id: campaign.id,
                  status: campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                })
              }
            />
          ))}
        </ul>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-bold">{t("createTitle")}</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{t("createHint")}</p>
            <label className="block text-xs font-semibold">{t("fieldName")}</label>
            <input
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="block text-xs font-semibold">{t("fieldDescription")}</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm min-h-[72px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div>
              <p className="text-xs font-semibold mb-2">{t("prizePool")}</p>
              <ul className="space-y-2">
                {prizes.map((prize, idx) => (
                  <li
                    key={`${prize.prizeKind}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)]/80 px-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{prize.label}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{prizeSummary(prize)}</p>
                    </div>
                    <label className="flex items-center gap-1 text-xs shrink-0">
                      {t("weight")}
                      <input
                        type="number"
                        min={1}
                        className="w-14 rounded border border-[var(--border)] px-1 py-0.5 text-center"
                        value={prize.weight ?? 1}
                        onChange={(e) => updatePrizeWeight(idx, Number(e.target.value) || 1)}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className={btnSecondarySm} onClick={() => setSheetOpen(false)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className={btnPrimarySm}
                disabled={create.isPending || !name.trim()}
                onClick={submitCreate}
              >
                {create.isPending ? t("saving") : t("saveCampaign")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign, onPause }: { campaign: ScratchCampaign; onPause: () => void }) {
  const t = useTranslations("admin.scratchCards");
  const totalWeight = campaign.prizes.reduce((s, p) => s + (p.weight ?? 1), 0);

  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--text-primary)]">{campaign.name}</h3>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.description ? (
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">{campaign.description}</p>
          ) : null}
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            {formatDate(campaign.startsAt)} – {formatDate(campaign.endsAt)} · {t("allBranches")}
          </p>
        </div>
        <button type="button" className={btnSecondarySm} onClick={onPause}>
          {campaign.status === "ACTIVE" ? t("pause") : t("resume")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {campaign.prizes.map((prize) => {
          const pct = Math.round(((prize.weight ?? 1) / totalWeight) * 100);
          return (
            <span
              key={prize.id ?? prize.label}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                prize.prizeKind === "TRY_AGAIN"
                  ? "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                  : "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
              )}
            >
              {prize.label} · {pct}%
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">
        {t("footfall", { issued: campaign.cardsIssued ?? 0, redeemed: campaign.cardsRedeemed ?? 0 })}
      </p>
    </li>
  );
}
