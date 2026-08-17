"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { BillBreakdownRows, membershipFeeServiceLine, type BillBreakdownPreview } from "@/components/billing/BillBreakdownRows";
import { InvoicePdfButtons } from "@/components/billing/InvoicePdfButtons";
import { BookingReviewInviteSection } from "@/components/reviews/BookingReviewInviteSection";
import { api, Booking, InvoiceDetail } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { SideSheet, AlertBanner, btnPrimary, btnSecondary, btnSecondarySm } from "@/components/ui";

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
}: BookingDetailSheetProps) {
  const t = useTranslations("manager.bookings");
  const tCommon = useTranslations("common");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  useEffect(() => {
    if (!open || !booking || booking.status !== "COMPLETED") {
      setInvoice(null);
      setInvoiceError("");
      return;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    setInvoiceError("");
    const load = booking.invoiceId
      ? api.getInvoice(booking.invoiceId)
      : api.getInvoiceByBooking(booking.id);
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
  }, [open, booking, t]);

  const secondaryBtn = useSecondaryButton ? btnSecondarySm : btnSecondary;

  return (
    <SideSheet
      open={open && !!booking}
      onClose={onClose}
      title={title ?? booking?.customerName ?? t("billingDetails")}
      subtitle={subtitle ?? (booking ? `${booking.customerPhone} · ${booking.status}` : undefined)}
      footer={
        booking?.status === "COMPLETED" && invoice ? (
          <InvoicePdfButtons
            invoiceId={invoice.id}
            filename={`invoice-${invoice.invoiceNumber}.pdf`}
            shareText={t("shareBillMessage", { name: shareCustomerName ?? booking.customerName ?? "Customer" })}
            shareLabel={t("shareBill")}
            downloadLabel={t("downloadBill")}
            processingLabel={tCommon("processing")}
            primaryClassName={`${btnPrimary} w-full min-h-12 justify-center touch-manipulation`}
            secondaryClassName={`${secondaryBtn} w-full min-h-11 justify-center touch-manipulation`}
            downloadTestId={downloadTestId}
            onError={setInvoiceError}
          />
        ) : booking && visitActionHref && isOpenStatus(booking.status) ? (
          <Link
            href={visitActionHref(booking)}
            className={`${btnPrimary} w-full min-h-12 justify-center`}
            onClick={onClose}
          >
            {booking.status === "READY_FOR_BILLING" ? t("billVisit") : t("continueVisit")}
          </Link>
        ) : undefined
      }
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
                const fee = membershipFeeServiceLine(invoice ?? booking.billPreview);
                if (!fee) return null;
                return (
                  <li className="flex justify-between gap-2">
                    <span>{fee.name}</span>
                    <span className="font-medium">{formatCurrency(fee.amount)}</span>
                  </li>
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
  );
}

/** Resolve booking from list cache or fetch by id for deep-linked detail views. */
export function useResolvedBooking(
  bookingId: string | null,
  bookings: Booking[],
  enabled = true
): { booking: Booking | null; loading: boolean } {
  const fromList = bookingId ? bookings.find((b) => b.id === bookingId) ?? null : null;
  const [fetched, setFetched] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !bookingId || fromList) {
      setFetched(null);
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
        if (!cancelled) setFetched(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, enabled, fromList]);

  return { booking: fromList ?? fetched, loading: loading && !fromList };
}
