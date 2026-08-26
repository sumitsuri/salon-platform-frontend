"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Megaphone, Send } from "lucide-react";
import { api, type CampaignChannel, type CreateCampaignRequest, type Customer } from "@/lib/api";
import { CampaignAudiencePreview } from "@/components/campaign/CampaignAudiencePreview";
import { CampaignHistoryPanel } from "@/components/campaign/CampaignHistoryPanel";
import {
  PageHeader,
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  PageLoader,
  SearchableSelect,
  SearchableMultiSelect,
  ConfirmDialog,
} from "@/components/ui";

type CampaignFormState = {
  name: string;
  channel: CampaignChannel;
  messageText: string;
  filterNames: string[];
  filterSociety: string;
  filterPhones: string[];
  filterMinVisitCount?: number;
  filterMaxVisitCount?: number;
  filterLastVisitFrom?: string;
  filterLastVisitTo?: string;
};

const emptyForm: CampaignFormState = {
  name: "",
  channel: "WHATSAPP",
  messageText: "",
  filterNames: [],
  filterSociety: "",
  filterPhones: [],
};

const VISIT_COUNT_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoStartOfYear(): string {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

async function loadCampaignFilterOptions() {
  const names = new Set<string>();
  const societies = new Set<string>();
  const phones = new Set<string>();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 30) {
    const res = await api.listCustomers({ page, size: 100 });
    totalPages = res.totalPages;
    for (const c of res.content) {
      if (c.name?.trim()) names.add(c.name.trim());
      if (c.society?.trim()) societies.add(c.society.trim());
      if (c.phone?.trim()) phones.add(c.phone.trim());
    }
    page += 1;
  }

  const sortLabels = (values: Set<string>) =>
    [...values]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value }));

  return {
    names: sortLabels(names),
    societies: sortLabels(societies),
    phones: sortLabels(phones),
  };
}

export default function AdminCampaignsPage() {
  const t = useTranslations("admin.campaigns");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignFormState>(emptyForm);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCustomers, setPreviewCustomers] = useState<Customer[] | null>(null);
  const [previewTruncated, setPreviewTruncated] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const { data: messaging } = useQuery({
    queryKey: ["messaging-config"],
    queryFn: () => api.getMessagingConfig(),
  });

  const { data: filterOptions, isLoading: filtersLoading } = useQuery({
    queryKey: ["campaign-filter-options"],
    queryFn: loadCampaignFilterOptions,
    staleTime: 5 * 60_000,
  });

  const lastVisitOptions = useMemo(
    () => [
      { value: "", label: t("lastVisitAny") },
      { value: isoDaysAgo(7), label: t("lastVisit7d") },
      { value: isoDaysAgo(30), label: t("lastVisit30d") },
      { value: isoDaysAgo(90), label: t("lastVisit90d") },
      { value: isoDaysAgo(180), label: t("lastVisit180d") },
      { value: isoStartOfYear(), label: t("lastVisitYtd") },
    ],
    [t],
  );

  const visitCountOptions = useMemo(
    () => [
      { value: "", label: t("visitAny") },
      ...VISIT_COUNT_OPTIONS.map((n) => ({ value: String(n), label: String(n) })),
    ],
    [t],
  );

  const preview = useMutation({
    mutationFn: () => api.previewCampaign(buildPayload(form)),
    onSuccess: (res) => {
      setPreviewCount(res.matchingCustomers);
      setPreviewCustomers(res.customers ?? []);
      setPreviewTruncated(res.previewTruncated ?? false);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const create = useMutation({
    mutationFn: () => api.createCampaign(buildPayload(form)),
    onSuccess: async (campaign) => {
      await api.sendCampaign(campaign.id);
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setForm(emptyForm);
      clearPreview();
      setSendConfirmOpen(false);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  function clearPreview() {
    setPreviewCount(null);
    setPreviewCustomers(null);
    setPreviewTruncated(false);
  }

  function updateField<K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearPreview();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {messaging && (
        <Card className="text-sm">
          {messaging.msg91Enabled ? (
            <div className="space-y-1 text-[var(--text-secondary)]">
              <p>
                {t("messagingReady", {
                  billTemplate: messaging.billReceiptTemplate,
                  promoTemplate: messaging.promoTemplate,
                })}
              </p>
              {messaging.billReceiptPilotEnabled && (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  {t("billReceiptPilot", {
                    tenant: messaging.billReceiptPilotTenantSlug,
                    branch: messaging.billReceiptPilotBranchCode,
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-amber-700 dark:text-amber-300">{t("messagingDisabled")}</p>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Megaphone className="w-4 h-4 text-[var(--brand)]" />
          {t("newCampaign")}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder={t("campaignName")}
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={inputClass}
          />
          <select
            value={form.channel}
            onChange={(e) => updateField("channel", e.target.value as CampaignChannel)}
            className={inputClass}
          >
            <option value="WHATSAPP">{t("whatsapp")}</option>
            <option value="SMS">{t("sms")}</option>
          </select>
        </div>

        <textarea
          placeholder={form.channel === "WHATSAPP" ? t("messageWhatsapp") : t("messageSms")}
          value={form.messageText}
          onChange={(e) => updateField("messageText", e.target.value)}
          className={`${inputClass} min-h-[88px]`}
        />

        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{t("customerFilters")}</p>

        {filtersLoading || !filterOptions ? (
          <PageLoader label={t("loadingFilters")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <SearchableMultiSelect
              value={form.filterNames}
              onChange={(v) => updateField("filterNames", v)}
              options={filterOptions.names}
              placeholder={t("nameContains")}
              allLabel={tCommon("all")}
            />
            <SearchableSelect
              value={form.filterSociety || ""}
              onChange={(v) => updateField("filterSociety", v)}
              options={filterOptions.societies}
              placeholder={t("societyContains")}
              allLabel={tCommon("all")}
            />
            <SearchableMultiSelect
              value={form.filterPhones}
              onChange={(v) => updateField("filterPhones", v)}
              options={filterOptions.phones}
              placeholder={t("phoneContains")}
              allLabel={tCommon("all")}
            />
            <SearchableSelect
              value={form.filterMinVisitCount != null ? String(form.filterMinVisitCount) : ""}
              onChange={(v) => updateField("filterMinVisitCount", v ? Number(v) : undefined)}
              options={visitCountOptions}
              placeholder={t("minVisits")}
              allLabel={t("visitAny")}
            />
            <SearchableSelect
              value={form.filterMaxVisitCount != null ? String(form.filterMaxVisitCount) : ""}
              onChange={(v) => updateField("filterMaxVisitCount", v ? Number(v) : undefined)}
              options={visitCountOptions}
              placeholder={t("maxVisits")}
              allLabel={t("visitAny")}
            />
            <SearchableSelect
              value={form.filterLastVisitFrom || ""}
              onChange={(v) => updateField("filterLastVisitFrom", v || undefined)}
              options={lastVisitOptions}
              placeholder={t("lastVisitFrom")}
              allLabel={t("lastVisitAny")}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => preview.mutate()}
            disabled={preview.isPending || !form.name || !form.messageText || filtersLoading}
            className={btnSecondary}
          >
            {preview.isPending ? t("counting") : t("previewAudience")}
          </button>
          {previewCount !== null && (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("customersMatch", { count: previewCount })}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (previewCount == null || previewCount <= 0) return;
              setSendConfirmOpen(true);
            }}
            disabled={
              create.isPending ||
              !form.name ||
              !form.messageText ||
              previewCount == null ||
              previewCount <= 0 ||
              (form.channel === "WHATSAPP" && messaging && !messaging.msg91Enabled)
            }
            className={`${btnPrimary} ml-auto`}
          >
            <Send className="w-4 h-4" />
            {create.isPending ? t("sending") : t("createAndSend")}
          </button>
        </div>
      </Card>

      {previewCustomers !== null && (
        <CampaignAudiencePreview
          customers={previewCustomers}
          totalCount={previewCount ?? 0}
          truncated={previewTruncated}
          channel={form.channel}
        />
      )}

      <ConfirmDialog
        open={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        onConfirm={() => create.mutate()}
        title={t("sendConfirmTitle")}
        description={
          <>
            <p>
              {t("sendConfirmBody", {
                name: form.name,
                count: previewCount ?? 0,
                channel: form.channel === "WHATSAPP" ? t("whatsapp") : t("sms"),
              })}
            </p>
            {previewCustomers && previewCustomers.length > 0 && (
              <ul className="text-xs text-[var(--text-tertiary)] list-disc pl-4 space-y-0.5">
                {previewCustomers.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </li>
                ))}
                {(previewCount ?? 0) > 5 && (
                  <li>{t("sendConfirmMoreRecipients", { count: (previewCount ?? 0) - 5 })}</li>
                )}
              </ul>
            )}
          </>
        }
        confirmLabel={create.isPending ? t("sending") : t("sendConfirmAction")}
        confirmPending={create.isPending}
      />

      <CampaignHistoryPanel />
    </div>
  );
}

function buildPayload(form: CampaignFormState): CreateCampaignRequest {
  return {
    name: form.name,
    channel: form.channel,
    messageText: form.messageText,
    filterNames: form.filterNames.length ? form.filterNames : undefined,
    filterSociety: form.filterSociety || undefined,
    filterPhones: form.filterPhones.length ? form.filterPhones : undefined,
    filterMinVisitCount: form.filterMinVisitCount,
    filterMaxVisitCount: form.filterMaxVisitCount,
    filterLastVisitFrom: form.filterLastVisitFrom || undefined,
    filterLastVisitTo: form.filterLastVisitTo || undefined,
    filterWhatsappOptInOnly: form.channel === "WHATSAPP" ? true : undefined,
    filterSmsOptInOnly: form.channel === "SMS" ? true : undefined,
  };
}
