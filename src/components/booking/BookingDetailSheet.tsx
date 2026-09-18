"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { AdminBillEditSheet } from "@/components/booking/AdminBillEditSheet";
import { BookingBillActionBar } from "@/components/booking/BookingBillActionBar";
import {
  BillBreakdownRows,
  membershipFeeServiceLine,
  packageFeeServiceLine,
  type BillBreakdownPreview,
} from "@/components/billing/BillBreakdownRows";
import { BookingReviewInviteSection } from "@/components/reviews/BookingReviewInviteSection";
import { api, Booking, InvoiceDetail } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  SideSheet,
  AlertBanner,
  btnPrimary,
  ConfirmDialog,
} from "@/components/ui";

function isOpenStatus(status: string) {
  return status === "IN_PROGRESS" || status === "READY_FOR_BILLING" || status === "DRAFT";
}

function resolveBillPreview(booking: Booking, inv: InvoiceDetail | null): BillBreakdownPreview | null {
  if (inv) {
    return {
      subtotal: inv.subtotal,
      membershipDiscountAmount: inv.membershipDiscountAmount,
      promoDiscountAmount: inv.promoDiscountAmount,
      membershipLabel: inv.membershipLabel,
      promoLabel: inv.promoLabel,
      membershipFeeAmount: inv.membershipFeeAmount,
      membershipFeeLabel: inv.membershipFeeLabel,
      packageFeeAmount: inv.packageFeeAmount,
      packageFeeLabel: inv.packageFeeLabel,
      cgstAmount: inv.cgstAmount,
      sgstAmount: inv.sgstAmount,
      grandTotal: inv.grandTotal,
    };
  }
  return booking.billPreview ?? null;
}

function BillingRows({ booking, inv }: { booking: Booking; inv: InvoiceDetail | null }) {
  const t = useTranslations("manager.bookings");
  const preview = resolveBillPreview(booking, inv);
  if (!preview) {
    return <p className="text-sm text-[var(--text-secondary)]">{t("noBillingYet")}</p>;
  }
  return <BillBreakdownRows preview={preview} />;
}

export type BookingDetailSheetProps = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  visitActionHref?: (booking: Booking) => string;
  shareCustomerName?: string;
  title?: string;
  subtitle?: string;
  useSecondaryButton?: boolean;
  downloadTestId?: string;
  /** CEO / brand admin: edit or void completed bills */
  adminBillTools?: boolean;
  onBillMutated?: () => void;
};

export function BookingDetailSheet({
  booking,
  open,
  onClose,
  visitActionHref,
  shareCustomerName,
  title,
  subtitle,
  useSecondaryButton = false,
  downloadTestId,
  adminBillTools = false,
  onBillMutated,
}: BookingDetailSheetProps) {
  const t = useTranslations("manager.bookings");
  const tAdmin = useTranslations("admin.bookings");
  const tCommon = useTranslations("common");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const bookingId = booking?.id;
  const bookingStatus = booking?.status;
  const bookingInvoiceId = booking?.invoiceId;

  useEffect(() => {
    if (!open || !bookingId || bookingStatus !== "COMPLETED") {
      setInvoice(null);
      setInvoiceError("");
      setInvoiceLoading(false);
      return;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    setInvoiceError("");
    setInvoice(null);

    const id = bookingId;
    async function loadInvoice() {
      if (bookingInvoiceId) {
        try {
          return await api.getInvoice(bookingInvoiceId);
        } catch {
          return await api.getInvoiceByBooking(id);
        }
      }
      return await api.getInvoiceByBooking(id);
    }

    loadInvoice()
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
  }, [open, bookingId, bookingStatus, bookingInvoiceId, t]);

  async function handleVoidBill() {
    if (!invoice) return;
    setDeleteBusy(true);
    setInvoiceError("");
    try {
      await api.voidInvoice(invoice.id);
      setDeleteOpen(false);
      onBillMutated?.();
      onClose();
    } catch (e) {
      setInvoiceError(e instanceof Error ? e.message : tCommon("failed"));
    } finally {
      setDeleteBusy(false);
    }
  }

  function handleBillSaved() {
    onBillMutated?.();
    if (booking?.invoiceId) {
      void api.getInvoice(booking.invoiceId).then(setInvoice).catch(() => {});
    } else if (booking) {
      void api.getInvoiceByBooking(booking.id).then(setInvoice).catch(() => {});
    }
  }

  function renderFooter() {
    if (!booking) return undefined;
    if (visitActionHref && isOpenStatus(booking.status)) {
      return (
        <Link
          href={visitActionHref(booking)}
          className={`${btnPrimary} w-full min-h-12 justify-center touch-manipulation`}
          onClick={onClose}
        >
          {booking.status === "READY_FOR_BILLING" ? t("billVisit") : t("continueVisit")}
        </Link>
      );
    }
    if (booking.status !== "COMPLETED") return undefined;
    if (invoiceLoading) {
      return (
        <p className="w-full text-center text-xs text-[var(--text-tertiary)] py-2 min-h-11 flex items-center justify-center">
          {tCommon("loading")}
        </p>
      );
    }
    if (!invoice) return undefined;

    const shareText = t("shareBillMessage", {
      name: shareCustomerName ?? booking.customerName ?? "Customer",
    });
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    if (adminBillTools) {
      return (
        <BookingBillActionBar
          invoiceId={invoice.id}
          filename={filename}
          shareText={shareText}
          shareLabel={t("shareBill")}
          downloadLabel={t("downloadBill")}
          processingLabel={tCommon("processing")}
          editLabel={tAdmin("editBill")}
          deleteLabel={tAdmin("deleteBill")}
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteOpen(true)}
          onError={setInvoiceError}
          downloadTestId={downloadTestId}
        />
      );
    }

    return (
      <BookingBillActionBar
        invoiceId={invoice.id}
        filename={filename}
        shareText={shareText}
        shareLabel={t("shareBill")}
        downloadLabel={t("downloadBill")}
        processingLabel={tCommon("processing")}
        onError={setInvoiceError}
        downloadTestId={downloadTestId}
      />
    );
  }

  return (
    <>
    <SideSheet
      open={open && !!booking}
      onClose={onClose}
      title={title ?? booking?.customerName ?? t("billingDetails")}
      subtitle={subtitle ?? (booking ? `${booking.customerPhone} · ${booking.status}` : undefined)}
      footer={renderFooter()}
    >
      {booking && (
        <div className="space-y-4 p-4">
          {invoiceError && <AlertBanner variant="error">{invoiceError}</AlertBanner>}

          <div>
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              {t("services")}
            </p>
            <ul className="space-y-1 text-sm">
              {booking.lines?.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span>
                    {l.serviceName}
                    {l.staffName ? ` · ${l.staffName}` : ""}
                  </span>
                  <span className="font-medium">{formatCurrency(l.unitPrice)}</span>
                </li>
              ))}
              {(() => {
                const preview = invoice ?? booking.billPreview;
                const fee = membershipFeeServiceLine(preview);
                const pkg = packageFeeServiceLine(preview);
                return (
                  <>
                    {fee ? (
                      <li className="flex justify-between gap-2">
                        <span>{fee.name}</span>
                        <span className="font-medium">{formatCurrency(fee.amount)}</span>
                      </li>
                    ) : null}
                    {pkg ? (
                      <li className="flex justify-between gap-2">
                        <span>{pkg.name}</span>
                        <span className="font-medium">{formatCurrency(pkg.amount)}</span>
                      </li>
                    ) : null}
                  </>
                );
              })()}
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
                <BillingRows booking={booking} inv={invoice} />
              </div>
            )}
          </div>

          {booking.status === "COMPLETED" && !invoice && !invoiceLoading && (
            <p className="text-sm text-[var(--text-secondary)]">{t("invoiceUnavailable")}</p>
          )}

          {booking.status === "COMPLETED" && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {t("reviewInviteSection")}
              </p>
              <BookingReviewInviteSection visitId={booking.id} enabled={booking.status === "COMPLETED"} />
            </div>
          )}

          {booking.status !== "COMPLETED" && !isOpenStatus(booking.status) && (
            <p className="text-sm text-[var(--text-secondary)]">{t("completeToDownload")}</p>
          )}
        </div>
      )}
    </SideSheet>
    {booking && adminBillTools ? (
      <AdminBillEditSheet
        booking={booking}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleBillSaved}
      />
    ) : null}
    <ConfirmDialog
      open={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      title={tAdmin("deleteBillTitle")}
      description={tAdmin("deleteBillConfirm")}
      confirmLabel={tAdmin("deleteBill")}
      cancelLabel={tCommon("cancel")}
      confirmPending={deleteBusy}
      error={deleteBusy ? undefined : invoiceError || undefined}
      onConfirm={() => void handleVoidBill()}
    />
    </>
  );
}

/** Resolve booking for detail sheet — list row for instant open, refresh by id whenever the sheet opens. */
export function useResolvedBooking(
  bookingId: string | null,
  bookings: Booking[],
  enabled = true,
  detailOpen = false
): { booking: Booking | null; loading: boolean } {
  const fromList = bookingId ? bookings.find((b) => b.id === bookingId) ?? null : null;
  const [fetched, setFetched] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !bookingId || !detailOpen) {
      if (!detailOpen) setFetched(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getBooking(bookingId)
      .then((b) => {
        if (!cancelled) setFetched(b);
      })
      .catch(() => {
        if (!cancelled) setFetched(fromList);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, enabled, detailOpen, fromList]);

  return { booking: fetched ?? fromList, loading: loading && !fetched && !fromList };
}
