"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, Filter } from "lucide-react";
import {
  api,
  type WhatsAppTemplate,
  type WhatsAppTemplateCategory,
} from "@/lib/api";
import { WhatsAppTemplatePreviewSheet } from "@/components/whatsapp/WhatsAppTemplatePreviewSheet";
import {
  Card,
  EmptyState,
  FilterableTable,
  MobileFilterPanel,
  PageHeader,
  PageLoader,
  StatusBadge,
  btnSecondarySm,
} from "@/components/ui";

type Filters = {
  search: string;
  category: string;
  status: string;
};

const emptyFilters: Filters = { search: "", category: "", status: "" };

const CATEGORIES: WhatsAppTemplateCategory[] = ["UTILITY", "MARKETING", "AUTHENTICATION"];

export default function AdminWhatsAppTemplatesPage() {
  const t = useTranslations("admin.whatsappTemplates");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const { data: messaging } = useQuery({
    queryKey: ["messaging-config"],
    queryFn: () => api.getMessagingConfig(),
  });

  const { data: templates = [], isLoading, isFetching } = useQuery({
    queryKey: ["whatsapp-templates", debounced],
    queryFn: () =>
      api.getWhatsAppTemplates({
        category: (debounced.category as WhatsAppTemplateCategory) || undefined,
        search: debounced.search || undefined,
      }),
  });

  const toggle = useMutation({
    mutationFn: ({ code, active }: { code: WhatsAppTemplate["code"]; active: boolean }) =>
      api.updateWhatsAppTemplate(code, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] }),
  });

  const filtered = useMemo(() => {
    if (!debounced.status) return templates;
    if (debounced.status === "active") return templates.filter((row) => row.active);
    if (debounced.status === "inactive") return templates.filter((row) => !row.active);
    if (debounced.status === "wired") return templates.filter((row) => row.wired);
    if (debounced.status === "planned") return templates.filter((row) => !row.wired);
    return templates;
  }, [templates, debounced.status]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const hasFilters = Object.values(filters).some((v) => v !== "");

  const columns = useMemo(
    () => [
      {
        label: t("templateName"),
        filter: {
          type: "text" as const,
          placeholder: t("templateName"),
          value: filters.search,
          onChange: (v: string) => updateFilter("search", v),
        },
      },
      {
        label: t("categoryLabel"),
        filter: {
          type: "select" as const,
          value: filters.category,
          onChange: (v: string) => updateFilter("category", v),
          options: [
            { value: "", label: tCommon("all") },
            ...CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) })),
          ],
        },
      },
      { label: t("messagePreview") },
      {
        label: tCommon("status"),
        filter: {
          type: "select" as const,
          value: filters.status,
          onChange: (v: string) => updateFilter("status", v),
          options: [
            { value: "", label: tCommon("all") },
            { value: "active", label: t("filterActive") },
            { value: "inactive", label: t("filterInactive") },
            { value: "wired", label: t("filterLive") },
            { value: "planned", label: t("filterPlanned") },
          ],
        },
      },
      { label: t("isActive") },
      { label: t("preview") },
    ],
    [filters, t, tCommon],
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card className="text-sm space-y-2">
        <p className="text-[var(--text-secondary)]">{t("metaBanner")}</p>
        {messaging && (
          <p className="text-xs text-[var(--text-tertiary)]">
            {messaging.msg91Enabled
              ? t("connectedBanner", {
                  number: messaging.whatsappNumber,
                  bill: messaging.billReceiptTemplate,
                  promo: messaging.promoTemplate,
                  appt: messaging.appointmentConfirmedTemplate,
                })
              : t("disconnectedBanner")}
          </p>
        )}
        <p className="text-xs">
          <Link href="/admin/campaigns" className="font-semibold text-[var(--brand-text)]">
            {t("campaignsLink")}
          </Link>
        </p>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("catalogTitle")}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {isLoading ? tCommon("loading") : `${filtered.length}${tAdmin("totalSuffix")}`}
            {isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`${btnSecondarySm} md:hidden`}
          aria-pressed={showFilters}
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
          <PageLoader label={tCommon("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="md:hidden divide-y divide-[var(--border)]">
              {filtered.map((row) => (
                <div key={row.code} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{row.displayName}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{row.msg91TemplateName}</p>
                    </div>
                    <StatusBadge status={row.category === "MARKETING" ? "MEDIUM" : row.category === "AUTHENTICATION" ? "INFO" : "CONFIRMED"} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{row.displayBody}</p>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={row.active}
                        disabled={toggle.isPending}
                        onChange={(e) => toggle.mutate({ code: row.code, active: e.target.checked })}
                      />
                      {t("isActive")}
                    </label>
                    <button type="button" className={btnSecondarySm} onClick={() => setPreviewTemplate(row)}>
                      <Eye className="w-4 h-4" />
                      {t("preview")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {filtered.map((row) => (
                  <tr key={row.code} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-primary)]">{row.displayName}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{row.msg91TemplateName}</p>
                      {!row.wired && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">{t("plannedBadge")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{t(`category.${row.category}`)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-md">
                      <p className="line-clamp-2">{row.displayBody}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">{row.triggerDescription}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.wired ? (
                        <StatusBadge status="SENT" />
                      ) : (
                        <StatusBadge status="DRAFT" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.active}
                        disabled={toggle.isPending}
                        onChange={(e) => toggle.mutate({ code: row.code, active: e.target.checked })}
                        aria-label={t("isActive")}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" className={btnSecondarySm} onClick={() => setPreviewTemplate(row)}>
                        <Eye className="w-4 h-4" />
                        {t("preview")}
                      </button>
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>
          </>
        )}
      </Card>

      <WhatsAppTemplatePreviewSheet template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
    </div>
  );
}
