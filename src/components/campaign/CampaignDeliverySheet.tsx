"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, type Campaign } from "@/lib/api";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { useClientInfiniteList } from "@/lib/use-client-infinite-list";
import {
  DetailField,
  EmptyState,
  FilterableTable,
  InfiniteScrollFooter,
  InfiniteScrollViewport,
  PageLoader,
  SideSheet,
  StatusBadge,
} from "@/components/ui";

function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

export function CampaignDeliverySheet({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.campaigns");
  const tCommon = useTranslations("common");
  const localeKit = getTenantLocaleKit();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["campaign-deliveries", campaign?.id],
    queryFn: () => api.getCampaignDeliveries(campaign!.id),
    enabled: !!campaign?.id,
  });
  const {
    visible: visibleDeliveries,
    totalElements: deliveryTotal,
    loadedCount,
    hasMore,
    loadMore,
  } = useClientInfiniteList(deliveries);

  const columns = [
    { label: tCommon("name") },
    { label: tCommon("phone") },
    { label: t("deliveryStatus") },
    { label: t("deliveryError") },
    { label: t("deliveredAt") },
  ];

  return (
    <SideSheet
      open={!!campaign}
      onClose={onClose}
      wide
      title={campaign?.name ?? t("historyTitle")}
      subtitle={
        campaign
          ? `${campaign.channel === "WHATSAPP" ? t("whatsapp") : t("sms")} · ${t("campaignResult", {
              sent: campaign.sentCount,
              failed: campaign.failedCount,
              total: campaign.recipientCount,
            })}`
          : undefined
      }
    >
      {campaign && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label={tCommon("status")} value={<StatusBadge status={campaign.status} />} />
            <DetailField
              label={t("sentAt")}
              value={campaign.sentAt ? formatTenantDateTime(campaign.sentAt, localeKit) : "—"}
            />
          </div>
          <DetailField label={t("messagePreview")} value={campaign.messageText} />

          <div>
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              {t("deliveryRecipients")}
            </p>
            {isLoading ? (
              <PageLoader label={tCommon("loading")} />
            ) : deliveries.length === 0 ? (
              <EmptyState
                title={t("deliveryEmptyTitle")}
                description={
                  campaign.status === "DRAFT" ? t("deliveryEmptyDraft") : t("deliveryEmptyDesc")
                }
              />
            ) : (
              <InfiniteScrollViewport>
                <div className="md:hidden divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
                  {visibleDeliveries.map((d) => (
                    <div key={d.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{d.customerName || "—"}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{formatPhone(d.recipientPhone)}</p>
                      {d.errorMessage && (
                        <p className="text-xs text-red-600 dark:text-red-400">{d.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="hidden md:block responsive-table-wrap rounded-xl border border-[var(--border)]">
                  <FilterableTable columns={columns}>
                    {visibleDeliveries.map((d) => (
                      <tr key={d.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                          {d.customerName || "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{formatPhone(d.recipientPhone)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] max-w-xs truncate">
                          {d.errorMessage || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {d.createdAt ? formatTenantDateTime(d.createdAt, localeKit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </FilterableTable>
                </div>
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
        </div>
      )}
    </SideSheet>
  );
}
