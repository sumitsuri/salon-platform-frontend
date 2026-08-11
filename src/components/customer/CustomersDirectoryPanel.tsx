"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { api, Customer } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { customerDetailPath } from "@/lib/navigation-scope";
import {
  PageHeader,
  Card,
  EmptyState,
  btnPrimary,
  btnSecondarySm,
  FilterableTable,
  MobileFilterPanel,
  InfiniteScrollFooter,
  AvatarInitial,
  AlertBanner,
  PageLoader,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

type Scope = "admin" | "manager";

type Filters = {
  name: string;
  visitPassId: string;
  phone: string;
  society: string;
};

const emptyFilters: Filters = {
  name: "",
  visitPassId: "",
  phone: "",
  society: "",
};

function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

export function CustomersDirectoryPanel({ scope }: { scope: Scope }) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const localeKit = getTenantLocaleKit();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [zeroBookingNotice, setZeroBookingNotice] = useState<string | null>(null);
  const filtersReady = useRef(false);

  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      setDebounced(filters);
      return;
    }
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const {
    items: customers,
    totalElements,
    hasMore,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    refetch,
    fetchNextPage,
  } = useInfinitePagedList({
    queryKey: ["customers", scope, debounced],
    queryFn: (page) =>
      api.listCustomers({
        name: debounced.name || undefined,
        visitPassId: debounced.visitPassId || undefined,
        phone: debounced.phone || undefined,
        society: debounced.society || undefined,
        page,
        size: DEFAULT_PAGE_SIZE,
      }),
    staleTime: 30_000,
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function openCustomer(customer: Customer) {
    if ((customer.visitCount ?? 0) <= 0) {
      setZeroBookingNotice(
        scope === "manager"
          ? t("noBookingsAtBranch", { name: customer.name })
          : t("noBookings", { name: customer.name })
      );
      return;
    }
    setZeroBookingNotice(null);
    router.push(customerDetailPath(scope, customer.id));
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
      label: t("visitPass"),
      filter: {
        type: "text" as const,
        placeholder: t("visitPassPlaceholder"),
        value: filters.visitPassId,
        onChange: (v: string) => updateFilter("visitPassId", v),
      },
    },
    {
      label: tCommon("phone"),
      filter: {
        type: "text" as const,
        placeholder: tCommon("phone"),
        value: filters.phone,
        onChange: (v: string) => updateFilter("phone", v),
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
    { label: t("visits") },
    { label: t("lifetimeSpend") },
    { label: t("lastVisit") },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={
          isLoading && customers.length === 0
            ? tCommon("loading")
            : `${totalElements}${tAdmin("totalSuffix")}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`
        }
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

      {zeroBookingNotice && (
        <AlertBanner variant="info">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <p>{zeroBookingNotice}</p>
            <button
              type="button"
              onClick={() => setZeroBookingNotice(null)}
              className="text-sm font-semibold text-[var(--brand-text)] shrink-0"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </AlertBanner>
      )}

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
          <PageLoader label={tCommon("loading")} />
        ) : isError ? (
          <div className="p-4 space-y-3">
            <AlertBanner variant="error">
              {error instanceof Error ? error.message : tCommon("failed")}
            </AlertBanner>
            <button type="button" onClick={() => void refetch()} className={`${btnPrimary} min-h-11`}>
              {tCommon("search")}
            </button>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="md:hidden divide-y divide-[var(--border)]">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCustomer(c)}
                  className="block w-full text-left px-4 py-3 flex gap-3 touch-manipulation min-h-[72px] hover:bg-[var(--surface-muted)]"
                >
                  <AvatarInitial name={c.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{c.name}</p>
                    <p className="text-xs font-mono text-[var(--brand-text)] truncate">{c.visitPassId || "—"}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatPhone(c.phone)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(c.lifetimeSpend)}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {(c.visitCount ?? 0) <= 0 ? t("zeroBookings") : t("visitCount", { count: c.visitCount })}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden md:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer"
                    onClick={() => openCustomer(c)}
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[var(--brand-text)]">{c.visitPassId || "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{formatPhone(c.phone)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{c.society || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {(c.visitCount ?? 0) <= 0 ? (
                        <span className="text-[var(--text-tertiary)]">{t("zeroBookings")}</span>
                      ) : (
                        c.visitCount
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(c.lifetimeSpend)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      {c.lastVisitAt ? formatTenantDateTime(c.lastVisitAt, localeKit) : "—"}
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>

            <InfiniteScrollFooter
              totalElements={totalElements}
              loadedCount={customers.length}
              hasMore={hasMore}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={isLoading}
              onLoadMore={() => void fetchNextPage()}
            />
          </>
        )}
      </Card>
    </div>
  );
}
