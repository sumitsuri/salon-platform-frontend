"use client";

import { useTranslations } from "next-intl";
import { type CampaignChannel, type Customer } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { useClientInfiniteList } from "@/lib/use-client-infinite-list";
import { AvatarInitial, Card, EmptyState, FilterableTable, InfiniteScrollFooter, InfiniteScrollViewport } from "@/components/ui";

function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

export function CampaignAudiencePreview({
  customers,
  totalCount,
  truncated,
  channel,
  variant = "card",
}: {
  customers: Customer[];
  totalCount: number;
  truncated: boolean;
  channel: CampaignChannel;
  variant?: "card" | "plain";
}) {
  const t = useTranslations("admin.campaigns");
  const tCustomers = useTranslations("customers");
  const tCommon = useTranslations("common");
  const localeKit = getTenantLocaleKit();
  const {
    visible: visibleCustomers,
    totalElements: listTotal,
    loadedCount,
    hasMore,
    loadMore,
  } = useClientInfiniteList(customers);

  const columns = [
    { label: tCommon("name") },
    { label: tCommon("phone") },
    { label: tCustomers("society") },
    { label: tCustomers("visits") },
    { label: tCustomers("lifetimeSpend") },
    { label: tCustomers("lastVisit") },
    ...(channel === "WHATSAPP" ? [{ label: t("whatsappOptIn") }] : []),
  ];

  const listBody = customers.length === 0 ? (
    <EmptyState title={t("previewAudienceEmpty")} description={t("previewAudienceEmptyDesc")} />
  ) : (
    <InfiniteScrollViewport>
      <div className="md:hidden divide-y divide-[var(--border)]">
        {visibleCustomers.map((c) => (
          <div key={c.id} className="flex gap-3 px-4 py-3 min-h-[72px]">
            <AvatarInitial name={c.name} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{c.name}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatPhone(c.phone)}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">{c.society || "—"}</p>
              {channel === "WHATSAPP" && (
                <p className="text-xs mt-1 text-[var(--text-secondary)]">
                  {t("whatsappOptIn")}: {c.whatsappOptIn ? t("optInYes") : t("optInNo")}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums">{formatCurrency(c.lifetimeSpend)}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {tCustomers("visitCount", { count: c.visitCount ?? 0 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block responsive-table-wrap">
        <FilterableTable columns={columns}>
          {visibleCustomers.map((c) => (
            <tr key={c.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{c.name}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{formatPhone(c.phone)}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{c.society || "—"}</td>
              <td className="px-4 py-3 tabular-nums">{c.visitCount ?? 0}</td>
              <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(c.lifetimeSpend)}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                {c.lastVisitAt ? formatTenantDateTime(c.lastVisitAt, localeKit) : "—"}
              </td>
              {channel === "WHATSAPP" && (
                <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">
                  {c.whatsappOptIn ? t("optInYes") : t("optInNo")}
                </td>
              )}
            </tr>
          ))}
        </FilterableTable>
      </div>
      <InfiniteScrollFooter
        totalElements={listTotal}
        loadedCount={loadedCount}
        hasMore={hasMore}
        isFetchingNextPage={false}
        onLoadMore={loadMore}
      />
    </InfiniteScrollViewport>
  );

  if (variant === "plain") {
    return (
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/40">
          <p className="text-xs text-[var(--text-secondary)]">
            {truncated
              ? t("previewAudienceTruncated", { shown: customers.length, total: totalCount })
              : t("customersMatch", { count: totalCount })}
          </p>
        </div>
        {listBody}
      </div>
    );
  }

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/50">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{t("previewAudienceList")}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {truncated
            ? t("previewAudienceTruncated", { shown: customers.length, total: totalCount })
            : t("customersMatch", { count: totalCount })}
        </p>
      </div>

      {listBody}
    </Card>
  );
}
