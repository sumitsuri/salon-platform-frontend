"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Megaphone, Send } from "lucide-react";
import { api, type CampaignChannel, type CreateCampaignRequest } from "@/lib/api";
import {
  PageHeader,
  Card,
  ListRow,
  EmptyState,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/components/ui";

const emptyForm: CreateCampaignRequest = {
  name: "",
  channel: "WHATSAPP",
  messageText: "",
  filterName: "",
  filterSociety: "",
  filterPhone: "",
};

export default function AdminCampaignsPage() {
  const t = useTranslations("admin.campaigns");
  const tAdmin = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCampaignRequest>(emptyForm);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.getCampaigns(),
  });

  const preview = useMutation({
    mutationFn: () => api.previewCampaign(buildPayload(form)),
    onSuccess: (res) => {
      setPreviewCount(res.matchingCustomers);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const create = useMutation({
    mutationFn: () => api.createCampaign(buildPayload(form)),
    onSuccess: async (campaign) => {
      await api.sendCampaign(campaign.id);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setForm(emptyForm);
      setPreviewCount(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  function updateField<K extends keyof CreateCampaignRequest>(key: K, value: CreateCampaignRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setPreviewCount(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
        <div className="grid gap-3 sm:grid-cols-3">
          <input placeholder={t("nameContains")} value={form.filterName || ""} onChange={(e) => updateField("filterName", e.target.value)} className={inputClass} />
          <input placeholder={t("societyContains")} value={form.filterSociety || ""} onChange={(e) => updateField("filterSociety", e.target.value)} className={inputClass} />
          <input placeholder={t("phoneContains")} value={form.filterPhone || ""} onChange={(e) => updateField("filterPhone", e.target.value)} className={inputClass} />
          <input type="number" min={0} placeholder={t("minVisits")} value={form.filterMinVisitCount ?? ""} onChange={(e) => updateField("filterMinVisitCount", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
          <input type="number" min={0} placeholder={t("maxVisits")} value={form.filterMaxVisitCount ?? ""} onChange={(e) => updateField("filterMaxVisitCount", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
          <input type="date" value={form.filterLastVisitFrom || ""} onChange={(e) => updateField("filterLastVisitFrom", e.target.value || undefined)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => preview.mutate()} disabled={preview.isPending || !form.name || !form.messageText} className={btnSecondary}>
            {preview.isPending ? t("counting") : t("previewAudience")}
          </button>
          {previewCount !== null && (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("customersMatch", { count: previewCount })}
            </p>
          )}
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.name || !form.messageText || previewCount === 0}
            className={`${btnPrimary} ml-auto`}
          >
            <Send className="w-4 h-4" />
            {create.isPending ? t("sending") : t("createAndSend")}
          </button>
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <p className="p-4 text-sm text-[var(--text-tertiary)]">{t("loading")}</p>
        ) : campaigns.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {campaigns.map((c) => (
              <ListRow
                key={c.id}
                title={c.name}
                subtitle={`${c.channel} · ${c.messageText.slice(0, 60)}${c.messageText.length > 60 ? "…" : ""}`}
                trailing={
                  <div className="text-right text-xs">
                    <p className="font-semibold text-[var(--text-primary)]">{c.status}</p>
                    <p className="text-[var(--text-tertiary)] mt-1">
                      {tAdmin("sentCount", { sent: c.sentCount, total: c.recipientCount })}
                      {c.failedCount > 0 ? tAdmin("failedCount", { count: c.failedCount }) : ""}
                    </p>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function buildPayload(form: CreateCampaignRequest): CreateCampaignRequest {
  return {
    ...form,
    filterName: form.filterName || undefined,
    filterSociety: form.filterSociety || undefined,
    filterPhone: form.filterPhone || undefined,
    filterLastVisitFrom: form.filterLastVisitFrom || undefined,
    filterLastVisitTo: form.filterLastVisitTo || undefined,
    filterWhatsappOptInOnly: form.channel === "WHATSAPP" ? true : undefined,
    filterSmsOptInOnly: form.channel === "SMS" ? true : undefined,
  };
}
