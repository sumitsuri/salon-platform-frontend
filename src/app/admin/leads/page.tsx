"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { api, Lead } from "@/lib/api";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { useUrlQueryParam } from "@/lib/use-url-query-param";
import { useDetailBreadcrumbs } from "@/lib/use-detail-breadcrumbs";
import { BreadcrumbItem } from "@/components/Breadcrumbs";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import {
  PageHeader,
  Card,
  ListRow,
  EmptyState,
  btnSecondarySm,
  FilterableTable,
  MobileFilterPanel,
  InfiniteScrollFooter,
  PageLoader,
  SideSheet,
  DetailField,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

type Filters = {
  name: string;
  society: string;
  email: string;
  mobile: string;
  message: string;
  date: string;
};

const emptyFilters: Filters = {
  name: "",
  society: "",
  email: "",
  mobile: "",
  message: "",
  date: "",
};

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <AdminLeadsPageContent />
    </Suspense>
  );
}

function AdminLeadsPageContent() {
  const t = useTranslations("admin.leads");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const leadParam = useUrlQueryParam("leadId");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const {
    items: leads,
    totalElements,
    hasMore,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfinitePagedList({
    queryKey: ["enquiries", debounced],
    queryFn: (page) =>
      api.getEnquiries({
        name: debounced.name || undefined,
        society: debounced.society || undefined,
        email: debounced.email || undefined,
        mobile: debounced.mobile || undefined,
        message: debounced.message || undefined,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size: DEFAULT_PAGE_SIZE,
      }),
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const selected = useMemo(
    () => (leadParam.value ? leads.find((l) => l.id === leadParam.value) ?? null : null),
    [leadParam.value, leads]
  );

  const detailBreadcrumbs = useMemo((): BreadcrumbItem[] | null => {
    if (!leadParam.isSet) return null;
    return [
      { label: t("title"), href: leadParam.hrefWithout, onClick: () => leadParam.set(null, "replace") },
      { label: selected?.name ?? t("title") },
    ];
  }, [leadParam, selected?.name, t]);

  useDetailBreadcrumbs(leadParam.isSet, detailBreadcrumbs);

  function openLead(lead: Lead) {
    leadParam.set(lead.id);
  }

  function closeLead() {
    leadParam.set(null, "replace");
  }

  const hasFilters = Object.values(filters).some((v) => v !== "");

  const columns = [
    {
      label: tCommon("name"),
      filter: {
        type: "text" as const,
        placeholder: tCommon("name"),
        value: filters.name,
        onChange: (v: string) => updateFilter("name", v),
      },
    },
    {
      label: t("society"),
      filter: {
        type: "text" as const,
        placeholder: t("society"),
        value: filters.society,
        onChange: (v: string) => updateFilter("society", v),
      },
    },
    {
      label: tCommon("email"),
      filter: {
        type: "text" as const,
        placeholder: tCommon("email"),
        value: filters.email,
        onChange: (v: string) => updateFilter("email", v),
      },
    },
    {
      label: t("mobile"),
      filter: {
        type: "text" as const,
        placeholder: t("mobile"),
        value: filters.mobile,
        onChange: (v: string) => updateFilter("mobile", v),
      },
    },
    {
      label: t("message"),
      filter: {
        type: "text" as const,
        placeholder: t("message"),
        value: filters.message,
        onChange: (v: string) => updateFilter("message", v),
      },
    },
    {
      label: tCommon("date"),
      filter: {
        type: "date" as const,
        value: filters.date,
        onChange: (v: string) => updateFilter("date", v),
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={`${t("subtitle", { count: totalElements })}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`}
        action={
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`${btnSecondarySm} md:hidden`}
            aria-pressed={showFilters}
            aria-label="Filters"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        }
      />

      <MobileFilterPanel columns={columns} open={showFilters} />

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
        ) : leads.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="md:hidden divide-y divide-[var(--border)]">
              {leads.map((lead) => (
                <ListRow
                  key={lead.id}
                  title={lead.name}
                  subtitle={`${lead.society || "—"} · ${lead.mobile}`}
                  onClick={() => openLead(lead)}
                  trailing={
                    <div className="text-right max-w-[140px]">
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{lead.email}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  }
                />
              ))}
            </div>

            <div className="hidden md:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer"
                    onClick={() => openLead(lead)}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{lead.name}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{lead.society || "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{lead.email}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{lead.mobile}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs">
                      <span className="line-clamp-2">{lead.message}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>
          </>
        )}

        <InfiniteScrollFooter
          totalElements={totalElements}
          loadedCount={leads.length}
          hasMore={hasMore}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          onLoadMore={() => void fetchNextPage()}
        />
      </Card>

      <SideSheet
        open={leadParam.isSet}
        onClose={closeLead}
        title={selected?.name || t("title")}
        subtitle={selected ? new Date(selected.createdAt).toLocaleString("en-IN") : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <DetailField label={t("society")} value={selected.society || "—"} />
            <DetailField label={tCommon("email")} value={selected.email || "—"} />
            <DetailField label={t("mobile")} value={selected.mobile || "—"} />
            <DetailField label={t("message")} value={selected.message || "—"} />
          </div>
        )}
      </SideSheet>
    </div>
  );
}
