"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader,
  Card,
  ListRow,
  EmptyState,
  btnSecondary,
  FilterableTable,
  TablePagination,
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
  const t = useTranslations("admin.leads");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    setPage(0);
  }, [debounced, size]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["enquiries", debounced, page, size],
    queryFn: () =>
      api.getEnquiries({
        name: debounced.name || undefined,
        society: debounced.society || undefined,
        email: debounced.email || undefined,
        mobile: debounced.mobile || undefined,
        message: debounced.message || undefined,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size,
      }),
  });

  const leads = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
            onClick={() => setShowFilters((v) => !v)}
            className={`${btnSecondary} py-2.5 px-3 lg:hidden`}
          >
            <Filter className="w-4 h-4" />
          </button>
        }
      />

      {hasFilters && (
        <button
          onClick={() => setFilters(emptyFilters)}
          className="text-sm font-semibold text-[var(--brand-text)]"
        >
          {tAdmin("clearFilters")}
        </button>
      )}

      <Card padding={false}>
        {isLoading ? (
          <p className="p-4 text-[var(--text-tertiary)] text-sm">{t("loading")}</p>
        ) : leads.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="lg:hidden divide-y divide-[var(--border)]">
              {leads.map((lead) => (
                <ListRow
                  key={lead.id}
                  title={lead.name}
                  subtitle={`${lead.society || "—"} · ${lead.mobile}`}
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

            <div className={showFilters ? "hidden lg:block" : "hidden lg:block"}>
              <FilterableTable columns={columns}>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]">
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

        <TablePagination
          page={page}
          size={size}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </Card>
    </div>
  );
}
