"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { api, Booking } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { NavigationScopeBanner } from "@/components/NavigationScopeBanner";
import { BookingDetailSheet, useResolvedBooking } from "@/components/booking/BookingDetailSheet";
import { adminBookingsPath } from "@/lib/navigation-scope";
import { parseDateRangeFromSearchParams } from "@/lib/date-range";
import { useCustomerScopeNavigation } from "@/lib/use-customer-scope-navigation";
import { useUrlQueryParam } from "@/lib/use-url-query-param";
import { useDetailBreadcrumbs } from "@/lib/use-detail-breadcrumbs";
import { BreadcrumbItem } from "@/components/Breadcrumbs";
import {
  PageHeader,
  Card,
  StatusBadge,
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
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";

const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  branch: string;
  service: string;
  stylist: string;
  amount: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  customer: "",
  branch: "",
  service: "",
  stylist: "",
  amount: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

function readLocationSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function readUrlBranchScope(): { branchId: string; branchName: string } | null {
  const params = readLocationSearchParams();
  const branchId = params.get("branchId");
  if (!branchId) return null;
  return { branchId, branchName: params.get("branchName") ?? "" };
}

function readUrlDateFilters(): Pick<Filters, "dateFrom" | "dateTo"> | null {
  const params = readLocationSearchParams();
  if (!params.has("range") && !params.has("from")) return null;
  const range = parseDateRangeFromSearchParams(params);
  return { dateFrom: range.from, dateTo: range.to };
}

function buildFiltersFromLocation(): Filters {
  const params = readLocationSearchParams();
  const dateFilters = readUrlDateFilters();
  const branchScope = readUrlBranchScope();
  return {
    ...emptyFilters,
    ...(dateFilters ?? {}),
    ...(branchScope?.branchName ? { branch: branchScope.branchName } : {}),
  };
}

function parseAmount(value: string): { minAmount?: number; maxAmount?: number } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const num = Number(trimmed.replace(/[₹,\s]/g, ""));
  if (Number.isNaN(num)) return {};
  return { minAmount: num, maxAmount: num };
}

function AdminBookingsPageContent() {
  const t = useTranslations("admin.bookings");
  const tCustomers = useTranslations("customers");
  const tMgr = useTranslations("manager.bookings");
  const tSchedule = useTranslations("manager.schedule");
  const tAdmin = useTranslations("admin.common");
  const tAdminLayout = useTranslations("admin.layout");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [customerIdFilter, setCustomerIdFilter] = useState("");
  const [branchScopeId, setBranchScopeId] = useState("");
  const [branchNameFromUrl, setBranchNameFromUrl] = useState("");
  const [urlReady, setUrlReady] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const detailParam = useUrlQueryParam("detailBookingId");
  const branchParam = useUrlQueryParam("branchId");
  const filtersReady = useRef(false);
  const urlFiltersApplied = useRef(false);

  function syncFromLocation() {
    const params = readLocationSearchParams();
    const branchId = params.get("branchId") ?? "";
    const branchName = params.get("branchName") ?? "";
    setBranchScopeId(branchId);
    setBranchNameFromUrl(branchName);

    const customerId = params.get("customerId");
    if (customerId) setCustomerIdFilter(customerId);

    const next = buildFiltersFromLocation();
    const hasScopedFilters =
      !!readUrlDateFilters() || !!branchName || !!branchId;

    if (hasScopedFilters) {
      setFilters(next);
      setDebounced(next);
    }
    urlFiltersApplied.current = true;
    setUrlReady(true);
  }

  useLayoutEffect(() => {
    syncFromLocation();
  }, []);

  // Static export: useSearchParams() is often empty even when the address bar has query params.
  useEffect(() => {
    syncFromLocation();
  }, [searchParams, branchParam.value]);

  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ["branch", branchScopeId],
    queryFn: () => api.getBranch(branchScopeId),
    enabled: urlReady && !!branchScopeId,
    staleTime: 60_000,
  });

  const branchDisplayName = branch?.name || branchNameFromUrl;
  const isBranchScoped = !!branchScopeId;

  useEffect(() => {
    if (!branch?.name || !branchScopeId) return;
    setFilters((prev) => (prev.branch === branch.name ? prev : { ...prev, branch: branch.name }));
    setDebounced((prev) => (prev.branch === branch.name ? prev : { ...prev, branch: branch.name }));
  }, [branch?.name, branchScopeId]);

  const { customer, customersHref, customersLabel, customerDetailHref, isScoped } = useCustomerScopeNavigation({
    customerId: customerIdFilter || undefined,
    scope: "admin",
    currentPageLabel: t("title"),
  });

  function clearCustomerScope() {
    setCustomerIdFilter("");
    const params = new URLSearchParams(window.location.search);
    const hasRange = params.has("range") || params.has("from");
    const dateRange = hasRange ? parseDateRangeFromSearchParams(params) : undefined;
    window.history.replaceState(
      window.history.state,
      "",
      adminBookingsPath({ branchId: branchScopeId || undefined, dateRange }),
    );
  }

  function clearBranchScope() {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("branchId");
      params.delete("branchName");
      const q = params.toString();
      window.history.replaceState(window.history.state, "", q ? `/admin/bookings/?${q}` : "/admin/bookings/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setBranchScopeId("");
    setBranchNameFromUrl("");
    branchParam.set(null, "replace");
    setFilters((prev) => ({ ...prev, branch: "" }));
  }

  function updateDateFrom(value: string) {
    setFilters((prev) => ({
      ...prev,
      dateFrom: value,
      dateTo: prev.dateFrom === prev.dateTo ? value : prev.dateTo,
    }));
  }

  function updateDateTo(value: string) {
    setFilters((prev) => ({ ...prev, dateTo: value }));
  }

  useEffect(() => {
    if (!urlFiltersApplied.current) return;
    if (!filtersReady.current) {
      filtersReady.current = true;
      const hasUrlFilters = readUrlDateFilters() || readUrlBranchScope()?.branchId;
      if (!hasUrlFilters) setDebounced(filters);
      return;
    }
    const timer = setTimeout(() => {
      setDebounced(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const amountFilter = parseAmount(debounced.amount);

  const {
    items: bookings,
    totalElements,
    hasMore,
    isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfinitePagedList({
    queryKey: ["admin-bookings", debounced, amountFilter, customerIdFilter, branchScopeId],
    queryFn: (page) =>
      api.getBookings({
        customerId: customerIdFilter || undefined,
        customer: customerIdFilter ? undefined : debounced.customer || undefined,
        branchId: branchScopeId || undefined,
        branch: branchScopeId ? undefined : debounced.branch || undefined,
        service: debounced.service || undefined,
        stylist: debounced.stylist || undefined,
        status: debounced.status || undefined,
        minAmount: amountFilter.minAmount,
        maxAmount: amountFilter.maxAmount,
        dateFrom: debounced.dateFrom || undefined,
        dateTo: debounced.dateTo || debounced.dateFrom || undefined,
        page,
        size: DEFAULT_PAGE_SIZE,
      }),
    enabled: urlReady,
    staleTime: 30_000,
  });

  const { booking: detailBooking } = useResolvedBooking(detailParam.value, bookings);

  const detailBreadcrumbs = useMemo((): BreadcrumbItem[] | null => {
    if (!detailParam.isSet) return null;
    const crumbs: BreadcrumbItem[] = [
      { label: t("title"), href: detailParam.hrefWithout, onClick: () => detailParam.set(null, "replace") },
    ];
    if (detailBooking) crumbs.push({ label: detailBooking.customerName });
    else crumbs.push({ label: tMgr("billingDetails") });
    return crumbs;
  }, [detailParam, detailBooking, t, tMgr]);

  useDetailBreadcrumbs(detailParam.isSet, detailBreadcrumbs);

  function openBookingDetail(booking: Booking) {
    detailParam.set(booking.id);
  }

  function closeBookingDetail() {
    detailParam.set(null, "replace");
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns = [
    {
      label: tMgr("columns.customer"),
      filter: {
        type: "text" as const,
        placeholder: tMgr("filters.namePhone"),
        value: filters.customer,
        onChange: (v: string) => updateFilter("customer", v),
      },
    },
    {
      label: tCommon("branch"),
      filter: {
        type: "text" as const,
        placeholder: tAdmin("filterBranch"),
        value: filters.branch,
        onChange: (v: string) => updateFilter("branch", v),
      },
    },
    {
      label: tMgr("columns.services"),
      filter: {
        type: "text" as const,
        placeholder: tMgr("filters.service"),
        value: filters.service,
        onChange: (v: string) => updateFilter("service", v),
      },
    },
    {
      label: tMgr("columns.stylist"),
      filter: {
        type: "text" as const,
        placeholder: tMgr("filters.stylist"),
        value: filters.stylist,
        onChange: (v: string) => updateFilter("stylist", v),
      },
    },
    {
      label: tMgr("columns.amount"),
      filter: {
        type: "text" as const,
        placeholder: tMgr("filters.amount"),
        value: filters.amount,
        onChange: (v: string) => updateFilter("amount", v),
      },
    },
    {
      label: tMgr("columns.status"),
      filter: {
        type: "select" as const,
        value: filters.status,
        onChange: (v: string) => updateFilter("status", v),
        options: STATUSES.map((s) => ({
          value: s,
          label: s ? tStatus(s as "COMPLETED") : tMgr("filters.all"),
        })),
      },
    },
    {
      label: tMgr("columns.time"),
      filter: {
        type: "date" as const,
        value: filters.dateFrom,
        onChange: updateDateFrom,
      },
    },
    ...(filters.dateFrom && filters.dateTo && filters.dateFrom !== filters.dateTo
      ? [
          {
            label: t("dateTo"),
            filter: {
              type: "date" as const,
              value: filters.dateTo,
              onChange: updateDateTo,
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={isBranchScoped && branchDisplayName ? branchDisplayName : t("title")}
        subtitle={
          isBranchScoped
            ? t("branchBookingsSubtitle")
            : tMgr("subtitle", { count: totalElements, loaded: bookings.length })
        }
      />

      {isBranchScoped && (
        <NavigationScopeBanner
          backHref="/admin"
          backLabel={tCommon("backTo", { page: tAdminLayout("nav.overview") })}
          title={branchDisplayName || (branchLoading ? tCommon("loading") : tCommon("branch"))}
          subtitle={t("branchBookingsSubtitle")}
          onClear={clearBranchScope}
        />
      )}

      {isScoped && (
        <NavigationScopeBanner
          backHref={customerDetailHref}
          backLabel={customer?.name ? tCommon("backTo", { page: customer.name }) : tCustomers("backToCustomers")}
          title={customer?.name ?? tCommon("loading")}
          subtitle={customer ? tCommon("showingFor", { name: customer.name }) : undefined}
          onClear={clearCustomerScope}
        />
      )}

      <Card padding={false}>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-2">
          <p className="text-sm text-[var(--text-secondary)]">
            {tMgr("subtitle", { count: totalElements, loaded: bookings.length })}
          </p>
          <button
            type="button"
            className={`${btnSecondarySm} md:hidden min-h-11 touch-manipulation`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="w-4 h-4" />
            {tAdmin("filters")}
          </button>
        </div>

        {showFilters && <MobileFilterPanel columns={columns} open={showFilters} />}

        {isLoading && bookings.length === 0 && <PageLoader />}
        {isError && (
          <div className="p-4 space-y-3">
            <AlertBanner variant="error">
              {error instanceof Error ? error.message : tCommon("failed")}
            </AlertBanner>
            <button type="button" onClick={() => void refetch()} className={`${btnPrimary} min-h-11`}>
              {tSchedule("refresh")}
            </button>
          </div>
        )}
        {!isLoading && !isError && bookings.length === 0 ? (
          <EmptyState title={tMgr("noBookingsTitle")} description={tMgr("noBookingsDesc")} />
        ) : null}
        {!isError && bookings.length > 0 ? (
          <>
            <div className="hidden md:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition cursor-pointer"
                    onClick={() => openBookingDetail(b)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarInitial name={b.customerName} />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{b.customerName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{b.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{b.branchName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {b.lines?.map((l) => (
                          <span
                            key={l.id}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--brand-light)] text-[var(--brand-text)]"
                          >
                            {l.serviceName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      {b.lines?.map((l) => l.staffName).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>

            <div className="md:hidden divide-y divide-[var(--border)]">
              {bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openBookingDetail(b)}
                  className="w-full text-left px-4 py-3 flex gap-3 touch-manipulation"
                >
                  <AvatarInitial name={b.customerName} />
                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{b.customerName}</p>
                    <p className="font-bold text-sm text-[var(--text-primary)] text-right">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] col-span-2">
                      {b.branchName} · {b.lines?.map((l) => l.serviceName).join(", ")}
                    </p>
                    <div className="col-span-2 flex items-center justify-between">
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        <InfiniteScrollFooter
          totalElements={totalElements}
          loadedCount={bookings.length}
          hasMore={hasMore}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          onLoadMore={() => void fetchNextPage()}
        />
      </Card>

      <BookingDetailSheet
        booking={detailBooking}
        open={detailParam.isSet}
        onClose={closeBookingDetail}
        title={detailBooking?.customerName ?? tMgr("billingDetails")}
        subtitle={
          detailBooking
            ? `${detailBooking.branchName} · ${detailBooking.customerPhone} · ${detailBooking.status}`
            : undefined
        }
        useSecondaryButton
        downloadTestId="admin-download-invoice"
      />
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <AdminBookingsPageContent />
    </Suspense>
  );
}
