"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Download, FileText, Filter } from "lucide-react";
import { api, Booking, InvoiceDetail } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  PageHeader,
  Card,
  StatusBadge,
  EmptyState,
  btnPrimary,
  btnSecondarySm,
  FilterableTable,
  MobileFilterPanel,
  TablePagination,
  AvatarInitial,
  SideSheet,
  AlertBanner,
  PageLoader,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  branch: string;
  service: string;
  stylist: string;
  amount: string;
  status: string;
  date: string;
};

const emptyFilters: Filters = {
  customer: "",
  branch: "",
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

export default function AdminBookingsPage() {
  const t = useTranslations("admin.bookings");
  const tMgr = useTranslations("manager.bookings");
  const tSchedule = useTranslations("manager.schedule");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const filtersReady = useRef(false);

  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      setDebounced(filters);
      return;
    }
    const timer = setTimeout(() => {
      setDebounced(filters);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

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
          setInvoiceError(e.message || tMgr("invoiceUnavailable"));
        }
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, tMgr]);

  const amountFilter = parseAmount(debounced.amount);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["all-bookings", debounced, page, size],
    queryFn: () =>
      api.getBookings({
        customer: debounced.customer || undefined,
        branch: debounced.branch || undefined,
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
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const bookings = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

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
      return <p className="text-sm text-[var(--text-secondary)]">{tMgr("noBillingYet")}</p>;
    }
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">{tCommon("subtotal")}</span>
          <span>{formatCurrency(preview.subtotal)}</span>
        </div>
        {(preview.membershipDiscountAmount ?? 0) > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>{preview.membershipLabel || tMgr("membershipDiscount")}</span>
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={
          isLoading && !data
            ? t("loading")
            : `${totalElements}${tAdmin("totalSuffix")}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`
        }
        action={
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`${btnSecondarySm} lg:hidden`}
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
        ) : isError ? (
          <div className="p-4 space-y-3">
            <AlertBanner variant="error">
              {error instanceof Error ? error.message : tCommon("failed")}
            </AlertBanner>
            <button type="button" onClick={() => void refetch()} className={`${btnPrimary} min-h-11`}>
              {tSchedule("refresh")}
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
        ) : (
          <>
            <div className="lg:hidden divide-y divide-[var(--border)]">
              {bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  data-testid="admin-booking-row"
                  onClick={() => setSelected(b)}
                  className="w-full text-left px-4 py-3 flex gap-3 touch-manipulation min-h-[64px]"
                >
                  <AvatarInitial name={b.customerName} />
                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{b.customerName}</p>
                    <p className="font-bold text-sm text-[var(--text-primary)] text-right">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] col-span-2">
                      {b.branchName} ·{" "}
                      {new Date(b.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] col-span-2 truncate">
                      {b.lines?.map((l) => l.serviceName).join(", ")}
                    </p>
                    <div className="col-span-2 flex justify-end">
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden lg:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    data-testid="admin-booking-row"
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer"
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
                    <td className="px-4 py-3 text-[var(--text-primary)]">{b.branchName}</td>
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
                    <td className="px-4 py-3 font-medium">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
          onSizeChange={(next) => {
            setSize(next);
            setPage(0);
          }}
        />
      </Card>

      <SideSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.customerName || tMgr("billingDetails")}
        subtitle={
          selected
            ? `${selected.branchName} · ${selected.customerPhone} · ${selected.status}`
            : undefined
        }
        footer={
          selected?.status === "COMPLETED" && invoice ? (
            <button
              type="button"
              data-testid="admin-download-invoice"
              onClick={() => void downloadInvoice()}
              disabled={downloading}
              className={`${btnPrimary} w-full`}
            >
              <Download className="w-4 h-4" />
              {downloading ? tCommon("processing") : tMgr("downloadBill")}
            </button>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 p-4">
            {invoiceError && <AlertBanner variant="error">{invoiceError}</AlertBanner>}

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {tMgr("services")}
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
                {tMgr("billingDetails")}
              </p>
              {invoiceLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  {invoice && (
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      {tMgr("invoiceNumber", { number: invoice.invoiceNumber })}
                      {invoice.pdfAvailable ? ` · ${tMgr("pdfStored")}` : ""}
                    </p>
                  )}
                  <BillingRows booking={selected} inv={invoice} />
                </div>
              )}
            </div>

            {selected.status === "COMPLETED" && !invoice && !invoiceLoading && (
              <p className="text-sm text-[var(--text-secondary)]">{tMgr("invoiceUnavailable")}</p>
            )}

            {selected.status !== "COMPLETED" && (
              <p className="text-sm text-[var(--text-secondary)]">{t("completeToDownload")}</p>
            )}
          </div>
        )}
      </SideSheet>
    </div>
  );
}
