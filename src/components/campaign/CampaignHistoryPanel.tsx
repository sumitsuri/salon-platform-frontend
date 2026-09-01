"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { api, type Campaign, type CampaignChannel, type CampaignStatus } from "@/lib/api";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import {
  Card,
  EmptyState,
  FilterableTable,
  MobileFilterPanel,
  PageLoader,
  StatusBadge,
  btnSecondarySm,
} from "@/components/ui";
import { CampaignDeliverySheet } from "@/components/campaign/CampaignDeliverySheet";

type Filters = {
  name: string;
  channel: string;
  status: string;
};

const emptyFilters: Filters = {
  name: "",
  channel: "",
  status: "",
};

const CHANNELS: CampaignChannel[] = ["WHATSAPP", "SMS"];
const STATUSES: CampaignStatus[] = ["DRAFT", "SENDING", "COMPLETED", "FAILED"];

export function CampaignHistoryPanel({ refreshKey }: { refreshKey?: number }) {
  const t = useTranslations("admin.campaigns");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const localeKit = getTenantLocaleKit();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const { data: campaigns = [], isLoading, isFetching } = useQuery({
    queryKey: ["campaigns", debounced, refreshKey],
    queryFn: () =>
      api.getCampaigns({
        name: debounced.name || undefined,
        channel: (debounced.channel as CampaignChannel) || undefined,
        status: (debounced.status as CampaignStatus) || undefined,
      }),
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      return rows.some((c) => c.status === "SENDING") ? 3000 : false;
    },
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const hasFilters = Object.values(filters).some((v) => v !== "");

  const columns = useMemo(
    () => [
      {
        label: t("campaignName"),
        filter: {
          type: "text" as const,
          placeholder: t("campaignName"),
          value: filters.name,
          onChange: (v: string) => updateFilter("name", v),
        },
      },
      {
        label: t("filterChannel"),
        filter: {
          type: "select" as const,
          value: filters.channel,
          onChange: (v: string) => updateFilter("channel", v),
          options: [
            { value: "", label: tCommon("all") },
            ...CHANNELS.map((c) => ({ value: c, label: t(c === "WHATSAPP" ? "whatsapp" : "sms") })),
          ],
        },
      },
      {
        label: t("messagePreview"),
      },
      {
        label: tCommon("status"),
        filter: {
          type: "select" as const,
          value: filters.status,
          onChange: (v: string) => updateFilter("status", v),
          options: [
            { value: "", label: tCommon("all") },
            ...STATUSES.map((s) => ({ value: s, label: tStatus(s) })),
          ],
        },
      },
      { label: t("recipients") },
      { label: t("sentAt") },
    ],
    [filters, t, tCommon, tStatus],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("historyTitle")}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {isLoading ? tCommon("loading") : `${campaigns.length}${tAdmin("totalSuffix")}`}
            {isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`${btnSecondarySm} md:hidden`}
          aria-pressed={showFilters}
          aria-label={tAdmin("filters")}
        >
          <Filter className="w-4 h-4" />
          {tAdmin("filters")}
        </button>
      </div>

      <MobileFilterPanel columns={columns} open={showFilters} onClose={() => setShowFilters(false)} />

      {hasFilters && (
        <button
          type="button"
          onClick={() => setFilters(emptyFilters)}
          className="text-sm font-semibold text-[var(--brand-text)]"
        >
          {tAdmin("clearFilters")}
        </button>
      )}

      <Card padding={false}>
        {isLoading ? (
          <PageLoader label={t("loading")} />
        ) : campaigns.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="md:hidden divide-y divide-[var(--border)]">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="block w-full text-left px-4 py-3 hover:bg-[var(--surface-muted)] touch-manipulation"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{c.name}</p>
                    <StatusBadge status={c.status === "SENDING" ? "SENDING" : c.status} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{c.messageText}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {t("campaignResult", {
                      sent: c.sentCount,
                      failed: c.failedCount,
                      total: c.recipientCount,
                    })}
                  </p>
                </button>
              ))}
            </div>

            <div className="hidden md:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{c.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {c.channel === "WHATSAPP" ? t("whatsapp") : t("sms")}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">{c.messageText}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status === "SENDING" ? "SENDING" : c.status} />
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[var(--text-secondary)]">
                      {t("campaignResult", {
                        sent: c.sentCount,
                        failed: c.failedCount,
                        total: c.recipientCount,
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {c.sentAt ? formatTenantDateTime(c.sentAt, localeKit) : "—"}
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>
          </>
        )}
      </Card>

      <CampaignDeliverySheet campaign={selected} onClose={() => setSelected(null)} />
    </>
  );
}
