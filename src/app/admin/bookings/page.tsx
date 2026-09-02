"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { api, Booking } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { formatBookingVisitAt } from "@/lib/booking-display";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { BookingDetailSheet, useResolvedBooking } from "@/components/booking/BookingDetailSheet";
import { adminBookingsPath } from "@/lib/navigation-scope";
import { parseDateRangeFromSearchParams } from "@/lib/date-range";
import { useCustomerScopeNavigation } from "@/lib/use-customer-scope-navigation";
import { buildPathWithSearch, useUrlQueryParam } from "@/lib/use-url-query-param";
import { useDetailBreadcrumbs } from "@/lib/use-detail-breadcrumbs";
import { BreadcrumbItem } from "@/components/Breadcrumbs";
import { ActiveFilterChip, DataListPanel } from "@/components/DataListPanel";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  btnPrimary,
  FilterableTable,
  InfiniteScrollFooter,
  AvatarInitial,
  AlertBanner,
  PageLoader,
  ActiveScopeChip,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  branchId: string;
  service: string;
  stylist: string;
  amount: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  customer: "",
  branchId: "",
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
  const dateFilters = readUrlDateFilters();
  const branchScope = readUrlBranchScope();
  return {
    ...emptyFilters,
    ...(dateFilters ?? {}),
    ...(branchScope?.branchId ? { branchId: branchScope.branchId } : {}),
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
  const tMgr = useTranslations("manager.bookings");
  const tCustomers = useTranslations("customers");
  const tSchedule = useTranslations("manager.schedule");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const localeKit = getTenantLocaleKit();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [customerIdFilter, setCustomerIdFilter] = useState("");
  const [branchScopeId, setBranchScopeId] = useState("");
  const [branchNameFromUrl, setBranchNameFromUrl] = useState("");
  const [urlReady, setUrlReady] = useState(true);
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

  useEffect(() => {
    syncFromLocation();
  }, [branchParam.value]);

  const { data: branch } = useQuery({
    queryKey: ["branch", branchScopeId],
    queryFn: () => api.getBranch(branchScopeId),
    enabled: urlReady && !!branchScopeId,
    staleTime: 60_000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    staleTime: 300_000,
  });

  const { data: catalogServices = [] } = useQuery({
    queryKey: ["catalog-services", false],
    queryFn: () => api.getCatalogServices(false),
    staleTime: 300_000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: () => api.getAllStaff(),
    staleTime: 300_000,
  });

  const branchDisplayName =
    branch?.name ||
    branchNameFromUrl ||
    branches.find((b) => b.id === branchScopeId)?.name ||
    "";
  const isBranchScoped = !!branchScopeId;

  const effectiveBranchId = branchScopeId || debounced.branchId;

  const branchOptions = useMemo(
    () =>
      branches
        .filter((b) => b.status !== "INACTIVE")
        .map((b) => ({ value: b.id, label: b.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [branches],
  );

  const serviceOptions = useMemo(
    () =>
      catalogServices
        .filter((s) => s.active)
        .map((s) => ({ value: s.name, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalogServices],
  );

  const stylistOptions = useMemo(() => {
    const filterBranchId = branchScopeId || filters.branchId;
    let list = allStaff.filter((s) => s.active);
    if (filterBranchId) {
      list = list.filter((s) => s.branchId === filterBranchId);
    }
    const names = [...new Set(list.map((s) => s.name))].sort((a, b) => a.localeCompare(b));
    return names.map((name) => ({ value: name, label: name }));
  }, [allStaff, branchScopeId, filters.branchId]);

  const { customer, isScoped } = useCustomerScopeNavigation({
    customerId: customerIdFilter || undefined,
    scope: "admin",
  });

  function clearCustomerScope() {
    setCustomerIdFilter("");
    const params = new URLSearchParams(window.location.search);
    params.delete("customerId");
    const hasRange = params.has("range") || params.has("from");
    const dateRange = hasRange ? parseDateRangeFromSearchParams(params) : undefined;
    const href = adminBookingsPath({ branchId: branchScopeId || undefined, dateRange });
    window.history.pushState(window.history.state, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function clearBranchScope() {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("branchId");
      params.delete("branchName");
      const href = buildPathWithSearch("/admin/bookings", params);
      window.history.pushState(window.history.state, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setBranchScopeId("");
    setBranchNameFromUrl("");
    setFilters((prev) => ({ ...prev, branchId: "" }));
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
    queryKey: ["admin-bookings", debounced, amountFilter, customerIdFilter, branchScopeId, effectiveBranchId],
    queryFn: (page) =>
      api.getBookings({
        customerId: customerIdFilter || undefined,
        customer: customerIdFilter ? undefined : debounced.customer || undefined,
        branchId: effectiveBranchId || undefined,
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
      { label: t("title"), href: detailParam.hrefWithout, onClick: () => detailParam.unset() },
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
    detailParam.unset();
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearAllFilters() {
    setFilters((prev) => ({
      ...emptyFilters,
      ...(branchScopeId ? { branchId: branchScopeId } : {}),
    }));
  }

  const activeChips = useMemo((): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = [];
    if (debounced.customer.trim()) {
      chips.push({
        key: "customer",
        label: debounced.customer.trim(),
        onClear: () => updateFilter("customer", ""),
      });
    }
    if (debounced.branchId && !branchScopeId) {
      const branchLabel =
        branchOptions.find((option) => option.value === debounced.branchId)?.label ?? debounced.branchId;
      chips.push({
        key: "branch",
        label: branchLabel,
        onClear: () => updateFilter("branchId", ""),
      });
    }
    if (debounced.service) {
      chips.push({
        key: "service",
        label: debounced.service,
        onClear: () => updateFilter("service", ""),
      });
    }
    if (debounced.stylist) {
      chips.push({
        key: "stylist",
        label: debounced.stylist,
        onClear: () => updateFilter("stylist", ""),
      });
    }
    if (debounced.amount.trim()) {
      chips.push({
        key: "amount",
        label: debounced.amount.trim(),
        onClear: () => updateFilter("amount", ""),
      });
    }
    if (debounced.status) {
      chips.push({
        key: "status",
        label: tStatus(debounced.status as "COMPLETED"),
        onClear: () => updateFilter("status", ""),
      });
    }
    if (debounced.dateFrom) {
      chips.push({
        key: "dateFrom",
        label: debounced.dateFrom,
        onClear: () => updateFilter("dateFrom", ""),
      });
    }
    if (debounced.dateTo && debounced.dateTo !== debounced.dateFrom) {
      chips.push({
        key: "dateTo",
        label: `${t("dateTo")} ${debounced.dateTo}`,
        onClear: () => updateFilter("dateTo", ""),
      });
    }
    return chips;
  }, [debounced, branchScopeId, branchOptions, t, tStatus]);

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
        type: "searchable-select" as const,
        value: branchScopeId || filters.branchId,
        onChange: (v: string) => updateFilter("branchId", v),
        options: branchOptions,
        placeholder: tAdmin("filterBranch"),
        allLabel: tCommon("all"),
        disabled: !!branchScopeId,
      },
    },
    {
      label: tMgr("columns.services"),
      filter: {
        type: "searchable-select" as const,
        value: filters.service,
        onChange: (v: string) => updateFilter("service", v),
        options: serviceOptions,
        placeholder: tMgr("filters.service"),
        allLabel: tCommon("all"),
      },
    },
    {
      label: tMgr("columns.stylist"),
      filter: {
        type: "searchable-select" as const,
        value: filters.stylist,
        onChange: (v: string) => updateFilter("stylist", v),
        options: stylistOptions,
        placeholder: tMgr("filters.stylist"),
        allLabel: tCommon("all"),
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
      label: tCustomers("lastVisit"),
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debounced.customer) count += 1;
    if (debounced.branchId && !branchScopeId) count += 1;
    if (debounced.service) count += 1;
    if (debounced.stylist) count += 1;
    if (debounced.amount) count += 1;
    if (debounced.status) count += 1;
    if (debounced.dateFrom) count += 1;
    return count;
  }, [debounced, branchScopeId]);

  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeader
        title={isBranchScoped && branchDisplayName ? branchDisplayName : isScoped && customer?.name ? customer.name : t("title")}
        subtitle={
          isBranchScoped || isScoped
            ? tMgr("subtitle", { count: totalElements, loaded: bookings.length })
            : undefined
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isBranchScoped && branchDisplayName ? (
              <ActiveScopeChip label={branchDisplayName} onClear={clearBranchScope} />
            ) : null}
            {isScoped && customer?.name ? (
              <ActiveScopeChip label={customer.name} onClear={clearCustomerScope} />
            ) : null}
          </div>
        }
      />

      <DataListPanel
        icon={CalendarDays}
        title={t("title")}
        hint={tMgr("subtitle", { count: totalElements, loaded: bookings.length })}
        activeChips={activeChips}
        onClearAllFilters={clearAllFilters}
        filterColumns={columns}
        showFilters={showFilters}
        onShowFiltersChange={setShowFilters}
        activeFilterCount={activeFilterCount}
      >
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
                      {formatBookingVisitAt(b, localeKit)}
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
                    <p className="text-[11px] text-[var(--text-tertiary)] col-span-2">
                      {tCustomers("lastVisit")}: {formatBookingVisitAt(b, localeKit)}
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
      </DataListPanel>

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
  return <AdminBookingsPageContent />;
}
