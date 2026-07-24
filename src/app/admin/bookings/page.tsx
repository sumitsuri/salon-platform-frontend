"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  PageHeader,
  Card,
  ListRow,
  StatusBadge,
  EmptyState,
  btnSecondary,
  FilterableTable,
  TablePagination,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  branch: string;
  amount: string;
  status: string;
  date: string;
};

const emptyFilters: Filters = {
  customer: "",
  branch: "",
  amount: "",
  status: "",
  date: "",
};

function parseAmount(value: string): { minAmount?: number; maxAmount?: number } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const num = Number(trimmed.replace(/[₹,\s]/g, ""));
  if (Number.isNaN(num)) return {};
  return { minAmount: num, maxAmount: num };
}

export default function AdminBookingsPage() {
  const t = useTranslations("admin.bookings");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
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

  const amountFilter = parseAmount(debounced.amount);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["all-bookings", debounced, page, size],
    queryFn: () =>
      api.getBookings({
        customer: debounced.customer || undefined,
        branch: debounced.branch || undefined,
        status: debounced.status || undefined,
        minAmount: amountFilter.minAmount,
        maxAmount: amountFilter.maxAmount,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size,
      }),
  });

  const bookings = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const hasFilters = Object.values(filters).some((v) => v !== "");

  const columns = [
    {
      label: t("customer"),
      filter: {
        type: "text" as const,
        placeholder: t("nameOrPhone"),
        value: filters.customer,
        onChange: (v: string) => updateFilter("customer", v),
      },
    },
    {
      label: tCommon("branch"),
      filter: {
        type: "text" as const,
        placeholder: tCommon("branch"),
        value: filters.branch,
        onChange: (v: string) => updateFilter("branch", v),
      },
    },
    {
      label: tCommon("amount"),
      filter: {
        type: "text" as const,
        placeholder: tCommon("amount"),
        value: filters.amount,
        onChange: (v: string) => updateFilter("amount", v),
      },
    },
    {
      label: tCommon("status"),
      filter: {
        type: "select" as const,
        value: filters.status,
        onChange: (v: string) => updateFilter("status", v),
        options: STATUSES.map((s) => ({
          value: s,
          label: s ? tStatus(s as "COMPLETED") : tCommon("all"),
        })),
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
        subtitle={`${totalElements}${tAdmin("totalSuffix")}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`}
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
        ) : bookings.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="lg:hidden divide-y divide-[var(--border)]">
              {bookings.map((b) => (
                <ListRow
                  key={b.id}
                  title={b.customerName}
                  subtitle={`${b.branchName} · ${new Date(b.createdAt).toLocaleDateString("en-IN")}`}
                  trailing={
                    <div className="text-right">
                      {b.billPreview && (
                        <p className="text-sm font-bold">{formatCurrency(b.billPreview.grandTotal)}</p>
                      )}
                      <StatusBadge status={b.status} />
                    </div>
                  }
                />
              ))}
            </div>

            <div className={showFilters ? "hidden lg:block" : "hidden lg:block"}>
              <FilterableTable columns={columns}>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--text-primary)]">{b.customerName}</span>
                      <br />
                      <span className="text-[var(--text-tertiary)] text-xs">{b.customerPhone}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{b.branchName}</td>
                    <td className="px-4 py-3 font-medium">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {new Date(b.createdAt).toLocaleDateString("en-IN")}
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
