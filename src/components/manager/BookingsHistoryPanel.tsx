"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserPlus, IndianRupee, Clock, CheckCircle2, Download, FileText, Receipt } from "lucide-react";
import { api, Booking, InvoiceDetail } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import {
  Card,
  StatusBadge,
  EmptyState,
  btnPrimary,
  btnSecondary,
  StatCard,
  FilterableTable,
  TablePagination,
  AvatarInitial,
  SideSheet,
  AlertBanner,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

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
}: {
  embedded?: boolean;
  onNewVisit?: () => void;
  wizardBaseHref?: string;
}) {
  const t = useTranslations("manager.bookings");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const branchId = useAuthStore((s) => s.user?.branchId) || "";
  const localeKit = getTenantLocaleKit();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    setPage(0);
  }, [debounced, size, branchId]);

  useEffect(() => {
    if (!selected || selected.status !== "COMPLETED") {
      setInvoice(null);
      setInvoiceError("");
      return;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    setInvoiceError("");
    const load = selected.invoiceId
      ? api.getInvoice(selected.invoiceId)
      : api.getInvoiceByBooking(selected.id);
    load
      .then((inv) => {
        if (!cancelled) setInvoice(inv);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setInvoice(null);
          setInvoiceError(e.message || t("invoiceUnavailable"));
        }
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, t]);

  const amountFilter = parseAmount(debounced.amount);

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", branchId, debounced, page, size],
    queryFn: () =>
      api.getBookings({
        branchId,
        customer: debounced.customer || undefined,
        service: debounced.service || undefined,
        stylist: debounced.stylist || undefined,
        status: debounced.status || undefined,
        minAmount: amountFilter.minAmount,
        maxAmount: amountFilter.maxAmount,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size,
      }),
    enabled: !!branchId,
  });

  const bookings = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const active = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const totalRevenue = completed.reduce((s, b) => s + (b.billPreview?.grandTotal || 0), 0);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function downloadInvoice() {
    if (!invoice?.id) return;
    setDownloading(true);
    setInvoiceError("");
    try {
      await api.downloadInvoicePdf(invoice.id, `invoice-${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      setInvoiceError(e instanceof Error ? e.message : tCommon("failed"));
    } finally {
      setDownloading(false);
    }
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
      label: t("columns.time"),
      filter: {
        type: "date" as const,
        value: filters.date,
        onChange: (v: string) => updateFilter("date", v),
      },
    },
  ];

  function BillingRows({ booking, inv }: { booking: Booking; inv: InvoiceDetail | null }) {
    const preview = inv
      ? {
          subtotal: inv.subtotal,
          membershipDiscountAmount: inv.membershipDiscountAmount,
          promoDiscountAmount: inv.promoDiscountAmount,
          membershipLabel: inv.membershipLabel,
          promoLabel: inv.promoLabel,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          grandTotal: inv.grandTotal,
        }
      : booking.billPreview;
    if (!preview) {
      return <p className="text-sm text-[var(--text-secondary)]">{t("noBillingYet")}</p>;
    }
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">{tCommon("subtotal")}</span>
          <span>{formatCurrency(preview.subtotal)}</span>
        </div>
        {(preview.membershipDiscountAmount ?? 0) > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>{preview.membershipLabel || t("membershipDiscount")}</span>
            <span>-{formatCurrency(preview.membershipDiscountAmount ?? 0)}</span>
          </div>
        )}
        {(preview.promoDiscountAmount ?? 0) > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>{preview.promoLabel || tCommon("discount")}</span>
            <span>-{formatCurrency(preview.promoDiscountAmount ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">CGST</span>
          <span>{formatCurrency(preview.cgstAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">SGST</span>
          <span>{formatCurrency(preview.sgstAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]">
          <span>{tCommon("grandTotal")}</span>
          <span className="text-[var(--brand-text)]">{formatCurrency(preview.grandTotal)}</span>
        </div>
      </div>
    );
  }

  function visitActionHref(b: Booking) {
    return `${wizardBaseHref}?bookingId=${b.id}`;
  }

  return (
    <div className={cn("space-y-4", embedded && "space-y-3")}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("subtitle", {
                count: totalElements,
                page: totalPages === 0 ? 0 : page + 1,
                totalPages: totalPages || 1,
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
            page: totalPages === 0 ? 0 : page + 1,
            totalPages: totalPages || 1,
          })}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t("revenuePage")} value={formatCurrency(totalRevenue)} icon={IndianRupee} accent="brand" />
        <StatCard label={t("completed")} value={completed.length} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("active")} value={active.length} icon={Clock} accent="amber" />
      </div>

      <Card padding={false}>
        {isLoading && <p className="p-4 text-[var(--text-secondary)] text-sm">{tCommon("loading")}</p>}
        {!isLoading && bookings.length === 0 ? (
          <EmptyState
            title={t("noBookingsTitle")}
            description={t("noBookingsDesc")}
            action={newVisitControl}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <FilterableTable columns={columns}>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition cursor-pointer"
                    onClick={() => setSelected(b)}
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
                      {formatTenantDateTime(b.createdAt, localeKit)}
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
                    onClick={() => setSelected(b)}
                    className="w-full text-left flex gap-3 touch-manipulation"
                  >
                    <AvatarInitial name={b.customerName} />
                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                      <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{b.customerName}</p>
                      <p className="font-bold text-sm text-[var(--text-primary)] text-right">
                        {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] col-span-2">
                        {formatTenantDateTime(b.createdAt, localeKit)}
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

      <SideSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.customerName || t("billingDetails")}
        subtitle={selected ? `${selected.customerPhone} · ${selected.status}` : undefined}
        footer={
          selected?.status === "COMPLETED" && invoice ? (
            <button
              type="button"
              onClick={() => void downloadInvoice()}
              disabled={downloading}
              className={`${btnPrimary} w-full min-h-12`}
            >
              <Download className="w-4 h-4" />
              {downloading ? tCommon("processing") : t("downloadBill")}
            </button>
          ) : selected && isOpenStatus(selected.status) ? (
            <Link
              href={visitActionHref(selected)}
              className={`${btnPrimary} w-full min-h-12 justify-center`}
              onClick={() => setSelected(null)}
            >
              {selected.status === "READY_FOR_BILLING" ? t("billVisit") : t("continueVisit")}
            </Link>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 p-4">
            {invoiceError && <AlertBanner variant="error">{invoiceError}</AlertBanner>}

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {t("services")}
              </p>
              <ul className="space-y-1 text-sm">
                {selected.lines?.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span>
                      {l.serviceName}
                      {l.staffName ? ` · ${l.staffName}` : ""}
                    </span>
                    <span className="font-medium">{formatCurrency(l.unitPrice)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t("billingDetails")}
              </p>
              {invoiceLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  {invoice && (
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      {t("invoiceNumber", { number: invoice.invoiceNumber })}
                      {invoice.pdfAvailable ? ` · ${t("pdfStored")}` : ""}
                    </p>
                  )}
                  <BillingRows booking={selected} inv={invoice} />
                </div>
              )}
            </div>

            {selected.status === "COMPLETED" && !invoice && !invoiceLoading && (
              <p className="text-sm text-[var(--text-secondary)]">{t("invoiceUnavailable")}</p>
            )}

            {selected.status !== "COMPLETED" && !isOpenStatus(selected.status) && (
              <p className="text-sm text-[var(--text-secondary)]">{t("completeToDownload")}</p>
            )}
          </div>
        )}
      </SideSheet>
    </div>
  );
}
