"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Clock, Pencil, Receipt } from "lucide-react";
import { api, Booking } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/utils";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { useSetPageBreadcrumbs } from "@/lib/breadcrumb-context";
import { BreadcrumbItem } from "@/components/Breadcrumbs";
import { AppScope, buildWalkInUrl, customerDetailPathWithBooking, customersPath } from "@/lib/navigation-scope";
import { useUrlQueryParam } from "@/lib/use-url-query-param";
import { useDetailBreadcrumbs } from "@/lib/use-detail-breadcrumbs";
import { BookingDetailSheet, useResolvedBooking } from "@/components/booking/BookingDetailSheet";
import { RegistrationCardPanel } from "@/components/customer/RegistrationCardPanel";
import {
  PageHeader,
  Card,
  EmptyState,
  btnPrimary,
  btnSecondary,
  btnSecondarySm,
  inputClass,
  StatusBadge,
  InfiniteScrollFooter,
  AvatarInitial,
  AlertBanner,
  PageLoader,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

function isOpenStatus(status: string) {
  return status === "IN_PROGRESS" || status === "READY_FOR_BILLING" || status === "DRAFT";
}

export function CustomerDetailPanel({ scope, customerId }: { scope: AppScope; customerId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("customers");
  const tBookings = useTranslations("manager.bookings");
  const tAdmin = useTranslations("admin.layout");
  const tManager = useTranslations("manager.nav");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const branchId = useAuthStore((s) => s.user?.branchId) || "";
  const localeKit = getTenantLocaleKit();

  const customersHref = customersPath(scope);
  const customersLabel = scope === "admin" ? tAdmin("nav.customers") : tManager("customers");
  const homeHref = scope === "admin" ? "/admin" : "/manager";
  const homeLabel = scope === "admin" ? tAdmin("nav.overview") : tManager("home");

  const {
    data: customer,
    isLoading: customerLoading,
    isError: customerError,
    error: customerLoadError,
    refetch: refetchCustomer,
  } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => api.getCustomer(customerId),
    staleTime: 60_000,
  });

  const { data: registrationCard, isLoading: cardLoading } = useQuery({
    queryKey: ["customer-registration-card", customerId, branchId],
    queryFn: () => api.getCustomerRegistrationCard(customerId, scope === "manager" ? branchId : undefined),
    enabled: !!customerId,
    staleTime: 60_000,
  });

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [
      { label: homeLabel, href: homeHref },
      { label: customersLabel, href: customersHref },
    ];
    if (customer?.name) {
      crumbs.push({ label: customer.name });
    } else {
      crumbs.push({ label: tCommon("loading") });
    }
    return crumbs;
  }, [customer?.name, homeHref, homeLabel, customersHref, customersLabel, tCommon]);

  useSetPageBreadcrumbs(breadcrumbs);

  useEffect(() => {
    if (customerLoading || !customer) return;
    if ((customer.visitCount ?? 0) <= 0) {
      router.replace(customersPath(scope));
    }
  }, [customer, customerLoading, router, scope]);

  const {
    items: bookings,
    totalElements,
    hasMore,
    isLoading: bookingsLoading,
    isError: bookingsError,
    error: bookingsLoadError,
    refetch: refetchBookings,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfinitePagedList({
    queryKey: ["customer-bookings", scope, customerId, branchId],
    queryFn: (page) =>
      api.getBookings({
        customerId,
        branchId: scope === "manager" ? branchId : undefined,
        page,
        size: DEFAULT_PAGE_SIZE,
      }),
    enabled: !!customerId && (scope === "admin" || !!branchId),
    staleTime: 30_000,
  });

  const detailParam = useUrlQueryParam("detailBookingId");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaveError, setNameSaveError] = useState("");

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => api.updateCustomer(customerId, { name }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["customer", customerId], updated);
      void queryClient.invalidateQueries({ queryKey: ["customer-registration-card", customerId] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditingName(false);
      setNameSaveError("");
    },
    onError: (e: Error) => setNameSaveError(e.message || t("nameRequired")),
  });

  function startNameEdit() {
    if (!customer) return;
    setNameDraft(customer.name);
    setNameSaveError("");
    setEditingName(true);
  }

  function cancelNameEdit() {
    setEditingName(false);
    setNameSaveError("");
  }

  function saveNameEdit() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameSaveError(t("nameRequired"));
      return;
    }
    if (trimmed === customer?.name) {
      setEditingName(false);
      return;
    }
    updateNameMutation.mutate(trimmed);
  }

  const { booking: detailBooking } = useResolvedBooking(detailParam.value, bookings);

  const detailBreadcrumbs = useMemo((): BreadcrumbItem[] | null => {
    if (!detailParam.isSet) return null;
    const crumbs: BreadcrumbItem[] = [
      { label: homeLabel, href: homeHref },
      { label: customersLabel, href: customersHref },
      {
        label: customer?.name ?? tCommon("loading"),
        href: customerDetailPathWithBooking(scope, customerId),
        onClick: () => detailParam.set(null, "replace"),
      },
    ];
    if (detailBooking) {
      crumbs.push({ label: formatTenantDateTime(detailBooking.createdAt, localeKit) });
    } else {
      crumbs.push({ label: tBookings("billingDetails") });
    }
    return crumbs;
  }, [
    detailParam,
    detailBooking,
    homeHref,
    homeLabel,
    customersHref,
    customersLabel,
    customer?.name,
    customerId,
    scope,
    localeKit,
    tCommon,
    tBookings,
  ]);

  useDetailBreadcrumbs(detailParam.isSet, detailBreadcrumbs);

  function openBookingDetail(booking: Booking) {
    detailParam.set(booking.id);
  }

  function closeBookingDetail() {
    detailParam.set(null, "replace");
  }

  function visitActionHref(b: Booking) {
    return buildWalkInUrl({ bookingId: b.id, customerId });
  }

  if (customerLoading) {
    return <PageLoader label={tCommon("loading")} />;
  }

  if (customerError || !customer) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={tCommon("failed")}
          breadcrumbs={[
            { label: homeLabel, href: homeHref },
            { label: customersLabel, href: customersHref },
          ]}
          breadcrumbsAlwaysVisible
          showBack={false}
        />
        <AlertBanner variant="error">
          {customerLoadError instanceof Error ? customerLoadError.message : tCommon("failed")}
        </AlertBanner>
        <button type="button" onClick={() => void refetchCustomer()} className={`${btnPrimary} min-h-11`}>
          {tBookings("refresh")}
        </button>
      </div>
    );
  }

  const profileSubtitle = [customer.visitPassId, formatPhone(customer.phone)].filter((v) => v && v !== "—").join(" · ");
  const bookingCount = Math.max(totalElements, customer.visitCount ?? 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={customer.name}
        subtitle={profileSubtitle || undefined}
        breadcrumbs={breadcrumbs}
        breadcrumbsAlwaysVisible
        showBack={false}
      />

      <Card className="space-y-4">
        <div className="flex items-start gap-4">
          <AvatarInitial name={customer.name} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{tCommon("name")}</p>
              {editingName ? (
                <div className="mt-1 space-y-2">
                  <input
                    className={inputClass}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoComplete="name"
                    aria-label={tCommon("name")}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveNameEdit}
                      disabled={updateNameMutation.isPending}
                      className={`${btnPrimary} min-h-10 px-4 text-sm`}
                    >
                      {updateNameMutation.isPending ? tCommon("processing") : t("saveName")}
                    </button>
                    <button
                      type="button"
                      onClick={cancelNameEdit}
                      disabled={updateNameMutation.isPending}
                      className={`${btnSecondary} min-h-10 px-4 text-sm`}
                    >
                      {t("cancelEdit")}
                    </button>
                  </div>
                  {nameSaveError && <p className="text-xs text-red-600 dark:text-red-400">{nameSaveError}</p>}
                </div>
              ) : (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-base font-semibold text-[var(--text-primary)]">{customer.name}</p>
                  <button
                    type="button"
                    onClick={startNameEdit}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)] hover:opacity-80 touch-manipulation"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("editName")}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{tCommon("phone")}</p>
              <p className="font-medium">{formatPhone(customer.phone)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("visitPass")}</p>
              <p className="font-medium font-mono text-[var(--brand-text)]">{customer.visitPassId || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("society")}</p>
              <p className="font-medium">{customer.society || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("flat")}</p>
              <p className="font-medium">{customer.flatUnit || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("visits")}</p>
              <p className="font-medium">{bookingCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("lifetimeSpend")}</p>
              <p className="font-medium">{formatCurrency(customer.lifetimeSpend)}</p>
            </div>
            <div className="col-span-1 min-[400px]:col-span-2 sm:col-span-3">
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("lastVisit")}</p>
              <p className="font-medium">
                {customer.lastVisitAt ? formatTenantDateTime(customer.lastVisitAt, localeKit) : "—"}
              </p>
            </div>
            </div>
          </div>
        </div>

        {cardLoading && <PageLoader label={tCommon("loading")} />}
        {!cardLoading && registrationCard && <RegistrationCardPanel card={registrationCard} />}
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("visitHistory")}</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {bookingsLoading && bookings.length === 0
            ? tCommon("loading")
            : t("visitHistorySubtitle", { count: bookingCount })}
        </p>
      </div>

      <Card padding={false}>
        {bookingsLoading && bookings.length === 0 ? (
          <PageLoader label={tCommon("loading")} />
        ) : bookingsError ? (
          <div className="p-4 space-y-3">
            <AlertBanner variant="error">
              {bookingsLoadError instanceof Error ? bookingsLoadError.message : tCommon("failed")}
            </AlertBanner>
            <button type="button" onClick={() => void refetchBookings()} className={`${btnPrimary} min-h-11`}>
              {tBookings("refresh")}
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState title={t("noVisitsTitle")} description={t("noVisitsDesc")} />
        ) : (
          <>
            <div className="hidden md:block responsive-table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                    {scope === "admin" && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)]">
                        {tCommon("branch")}
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)]">
                      {tBookings("columns.services")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)]">
                      {tBookings("columns.stylist")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)]">
                      {tCommon("amount")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)]">
                      {tCommon("status")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)]">
                      {tBookings("columns.time")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer transition"
                      onClick={() => openBookingDetail(b)}
                    >
                      {scope === "admin" && (
                        <td className="px-4 py-3 text-[var(--text-primary)]">{b.branchName}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
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
                        {formatTenantDateTime(b.createdAt, localeKit)}
                        {scope === "manager" && isOpenStatus(b.status) && (
                          <div className="mt-1">
                            <Link
                              href={visitActionHref(b)}
                              className="text-[var(--brand-text)] font-semibold hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {b.status === "READY_FOR_BILLING" ? tBookings("billVisit") : tBookings("continueVisit")}
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[var(--border)]">
              {bookings.map((b) => (
                <div key={b.id} className="px-4 py-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => openBookingDetail(b)}
                    className="w-full text-left space-y-1 touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm text-[var(--text-primary)]">
                        {formatTenantDateTime(b.createdAt, localeKit)}
                      </p>
                      <p className="font-bold text-sm text-[var(--text-primary)] shrink-0">
                        {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                      </p>
                    </div>
                    {scope === "admin" && (
                      <p className="text-xs text-[var(--text-secondary)]">{b.branchName}</p>
                    )}
                    <p className="text-xs text-[var(--text-secondary)]">
                      {b.lines?.map((l) => l.serviceName).join(", ")}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {b.lines?.map((l) => l.staffName).filter(Boolean).join(", ")}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                  </button>
                  {scope === "manager" && isOpenStatus(b.status) && (
                    <Link
                      href={visitActionHref(b)}
                      className={`${b.status === "READY_FOR_BILLING" ? btnPrimary : btnSecondary} w-full min-h-11 justify-center text-sm`}
                    >
                      {b.status === "READY_FOR_BILLING" ? (
                        <>
                          <Receipt className="w-4 h-4" />
                          {tBookings("billVisit")}
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          {tBookings("continueVisit")}
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
              isLoading={bookingsLoading}
              onLoadMore={() => void fetchNextPage()}
            />
          </>
        )}
      </Card>

      <BookingDetailSheet
        booking={detailBooking}
        open={detailParam.isSet}
        onClose={closeBookingDetail}
        visitActionHref={scope === "manager" ? visitActionHref : undefined}
        shareCustomerName={customer.name}
        title={formatTenantDateTime(detailBooking?.createdAt ?? "", localeKit) || tBookings("billingDetails")}
        subtitle={
          detailBooking
            ? `${detailBooking.branchName ? `${detailBooking.branchName} · ` : ""}${tStatus(detailBooking.status as "COMPLETED")}`
            : undefined
        }
        useSecondaryButton
      />
    </div>
  );
}
