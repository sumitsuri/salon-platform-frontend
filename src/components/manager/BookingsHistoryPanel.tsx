"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus, IndianRupee, Clock, CheckCircle2, Receipt } from "lucide-react";
import { api, Booking } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import { formatBookingVisitAt } from "@/lib/booking-display";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { NavigationScopeBanner } from "@/components/NavigationScopeBanner";
import { BookingDetailSheet, useResolvedBooking } from "@/components/booking/BookingDetailSheet";
import { AppScope, buildWalkInUrl } from "@/lib/navigation-scope";
import { useCustomerScopeNavigation } from "@/lib/use-customer-scope-navigation";
import { useUrlQueryParam } from "@/lib/use-url-query-param";
import { useDetailBreadcrumbs } from "@/lib/use-detail-breadcrumbs";
import { BreadcrumbItem } from "@/components/Breadcrumbs";
import {
  Card,
  StatusBadge,
  EmptyState,
  btnPrimary,
  btnSecondary,
  StatCard,
  FilterableTable,
  InfiniteScrollFooter,
  InfiniteScrollViewport,
  AvatarInitial,
  AlertBanner,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

const STATUSES = ["", "COMPLETED", "CONFIRMED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  service: string;
  stylist: string;
  amount: string;
  status: string;
  date: string;
};

const emptyFilters: Filters = {
  customer: "",
  service: "",
  stylist: "",
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

function isOpenStatus(status: string) {
  return status === "IN_PROGRESS" || status === "READY_FOR_BILLING" || status === "DRAFT";
}

export function BookingsHistoryPanel({
  embedded = false,
  onNewVisit,
  wizardBaseHref = "/manager/walk-in",
  initialCustomerId,
  navigationScope,
}: {
  embedded?: boolean;
  onNewVisit?: () => void;
  wizardBaseHref?: string;
  initialCustomerId?: string;
  /** When set, shows breadcrumbs and back link to customers when filtered by customerId. */
  navigationScope?: AppScope;
}) {
  const router = useRouter();
  const t = useTranslations("manager.bookings");
  const tWalkIn = useTranslations("manager.walkIn");
  const tCustomers = useTranslations("customers");
  const tSchedule = useTranslations("manager.schedule");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const branchId = useAuthStore((s) => s.user?.branchId) || "";
  const localeKit = getTenantLocaleKit();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [customerIdFilter, setCustomerIdFilter] = useState(initialCustomerId || "");
  const detailParam = useUrlQueryParam("detailBookingId");
  const filtersReady = useRef(false);

  useEffect(() => {
    if (initialCustomerId) setCustomerIdFilter(initialCustomerId);
  }, [initialCustomerId]);

  const historyTabLabel = tWalkIn("tabHistory");
  const { customer, customersLabel, customerDetailHref, isScoped } = useCustomerScopeNavigation({
    customerId: navigationScope && customerIdFilter ? customerIdFilter : undefined,
    scope: navigationScope ?? "manager",
    enabled: !!navigationScope && !!customerIdFilter,
  });

  function clearCustomerScope() {
    setCustomerIdFilter("");
    if (navigationScope === "manager") {
      router.push(buildWalkInUrl({ tab: "history" }));
    }
  }

  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      setDebounced(filters);
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
    queryKey: ["bookings", branchId, debounced, amountFilter, customerIdFilter],
    queryFn: (page) =>
      api.getBookings({
        branchId,
        customerId: customerIdFilter || undefined,
        customer: customerIdFilter ? undefined : debounced.customer || undefined,
        service: debounced.service || undefined,
        stylist: debounced.stylist || undefined,
        status: debounced.status || undefined,
        minAmount: amountFilter.minAmount,
        maxAmount: amountFilter.maxAmount,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size: DEFAULT_PAGE_SIZE,
      }),
    enabled: !!branchId,
    staleTime: 30_000,
  });
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const active = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const totalRevenue = completed.reduce((s, b) => s + (b.billPreview?.grandTotal || 0), 0);

  const { booking: detailBooking } = useResolvedBooking(detailParam.value, bookings);
  const listLabel = embedded ? historyTabLabel : t("title");

  const detailBreadcrumbs = useMemo((): BreadcrumbItem[] | null => {
    if (!detailParam.isSet) return null;
    const crumbs: BreadcrumbItem[] = [
      { label: listLabel, href: detailParam.hrefWithout, onClick: () => detailParam.unset() },
    ];
    if (detailBooking) crumbs.push({ label: detailBooking.customerName });
    else crumbs.push({ label: t("billingDetails") });
    return crumbs;
  }, [detailParam, detailBooking, listLabel, t]);

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

  const newVisitControl = onNewVisit ? (
    <button type="button" onClick={onNewVisit} className={`${btnPrimary} py-2.5 px-4 min-h-11`}>
      <UserPlus className="w-4 h-4" />
      {t("newWalkIn")}
    </button>
  ) : (
    <Link href={wizardBaseHref} className={`${btnPrimary} py-2.5 px-4 min-h-11`}>
      <UserPlus className="w-4 h-4" />
      {t("newWalkIn")}
    </Link>
  );

  const columns = [
    {
      label: t("columns.customer"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.namePhone"),
        value: filters.customer,
        onChange: (v: string) => updateFilter("customer", v),
      },
    },
    {
      label: t("columns.services"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.service"),
        value: filters.service,
        onChange: (v: string) => updateFilter("service", v),
      },
    },
    {
      label: t("columns.stylist"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.stylist"),
        value: filters.stylist,
        onChange: (v: string) => updateFilter("stylist", v),
      },
    },
    {
      label: t("columns.amount"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.amount"),
        value: filters.amount,
        onChange: (v: string) => updateFilter("amount", v),
      },
    },
    {
      label: t("columns.status"),
      filter: {
        type: "select" as const,
        value: filters.status,
        onChange: (v: string) => updateFilter("status", v),
        options: STATUSES.map((s) => ({
          value: s,
          label: s ? tStatus(s as "COMPLETED") : t("filters.all"),
        })),
      },
    },
    {
      label: tCustomers("lastVisit"),
      filter: {
        type: "date" as const,
        value: filters.date,
        onChange: (v: string) => updateFilter("date", v),
      },
    },
  ];

  function visitActionHref(b: Booking) {
    const params = new URLSearchParams({ bookingId: b.id });
    if (customerIdFilter) params.set("customerId", customerIdFilter);
    return `${wizardBaseHref}?${params.toString()}`;
  }

  const scopeSubtitle =
    customer?.phone || customer?.visitPassId
      ? [customer.phone, customer.visitPassId ? `${tCustomers("visitPass")}: ${customer.visitPassId}` : null]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  return (
    <div className={cn("space-y-4", embedded && "space-y-3")}>
      {isScoped && (
        <NavigationScopeBanner
          backHref={customerDetailHref}
          backLabel={customer?.name ? tCommon("backTo", { page: customer.name }) : tCustomers("backToCustomers")}
          title={customer?.name ?? tCommon("loading")}
          subtitle={customer ? scopeSubtitle ?? tCommon("showingFor", { name: customer.name }) : undefined}
          onClear={clearCustomerScope}
        />
      )}

      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("subtitle", {
                count: totalElements,
                loaded: bookings.length,
              })}
            </p>
          </div>
          <div className="hidden sm:block">{newVisitControl}</div>
        </div>
      )}

      {embedded && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t("subtitle", {
            count: totalElements,
            loaded: bookings.length,
          })}
        </p>
      )}

      <div className="mobile-stat-grid mobile-stat-grid--sm-3 gap-3">
        <StatCard label={t("revenuePage")} value={formatCurrency(totalRevenue)} icon={IndianRupee} accent="brand" />
        <StatCard label={t("completed")} value={completed.length} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("active")} value={active.length} icon={Clock} accent="amber" />
      </div>

      <Card padding={false}>
        {isLoading && bookings.length === 0 && (
          <p className="p-4 text-[var(--text-secondary)] text-sm">{tCommon("loading")}</p>
        )}
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
          <EmptyState
            title={t("noBookingsTitle")}
            description={t("noBookingsDesc")}
            action={newVisitControl}
          />
        ) : null}
        {!isError && bookings.length > 0 ? (
          <InfiniteScrollViewport>
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
                      {isOpenStatus(b.status) && (
                        <div className="mt-1">
                          <Link
                            href={visitActionHref(b)}
                            className="text-[var(--brand-text)] font-semibold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {b.status === "READY_FOR_BILLING" ? t("billVisit") : t("continueVisit")}
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>

            <div className="md:hidden divide-y divide-[var(--border)]">
              {bookings.map((b) => (
                <div key={b.id} className="px-4 py-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => openBookingDetail(b)}
                    className="w-full text-left flex gap-3 touch-manipulation"
                  >
                    <AvatarInitial name={b.customerName} />
                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                      <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{b.customerName}</p>
                      <p className="font-bold text-sm text-[var(--text-primary)] text-right">
                        {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] col-span-2">
                        {formatBookingVisitAt(b, localeKit)}
                        {" · "}
                        {b.lines?.map((l) => l.serviceName).join(", ")}
                      </p>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {b.lines?.map((l) => l.staffName).filter(Boolean).join(", ")}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  </button>
                  {isOpenStatus(b.status) && (
                    <Link
                      href={visitActionHref(b)}
                      className={`${b.status === "READY_FOR_BILLING" ? btnPrimary : btnSecondary} w-full min-h-11 justify-center text-sm`}
                    >
                      {b.status === "READY_FOR_BILLING" ? (
                        <>
                          <Receipt className="w-4 h-4" />
                          {t("billVisit")}
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          {t("continueVisit")}
                        </>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <InfiniteScrollFooter
              totalElements={totalElements}
              loadedCount={bookings.length}
              hasMore={hasMore}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={isLoading}
              onLoadMore={() => void fetchNextPage()}
            />
          </InfiniteScrollViewport>
        ) : null}
      </Card>

      <BookingDetailSheet
        booking={detailBooking}
        open={detailParam.isSet}
        onClose={closeBookingDetail}
        visitActionHref={visitActionHref}
      />
    </div>
  );
}
