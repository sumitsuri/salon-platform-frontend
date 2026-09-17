"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2 } from "lucide-react";
import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { btnPrimary } from "@/components/ui";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { cn } from "@/lib/utils";

export function WalkInPaymentCompleteModal({
  open,
  invoiceId,
  amountPaidLabel,
  reviewUrl,
  reviewSubmittedRating,
  shareBillMessage,
  receiptDeliveryStatus,
  receiptDeliveryError,
  customerPhone,
  customerName,
  processingLabel,
  onDone,
  onError,
}: {
  open: boolean;
  invoiceId: string;
  amountPaidLabel: string;
  reviewUrl?: string;
  reviewSubmittedRating?: number | null;
  shareBillMessage: string;
  receiptDeliveryStatus?: "SENT" | "SKIPPED" | "FAILED" | "PENDING";
  receiptDeliveryError?: string;
  customerPhone?: string;
  customerName?: string;
  processingLabel: string;
  onDone: () => void;
  onError?: (message: string) => void;
}) {
  const t = useTranslations("manager.walkIn");
  const [mounted, setMounted] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setShowCelebration(false);
      return;
    }
    const t0 = window.setTimeout(() => setShowCelebration(true), 40);
    return () => window.clearTimeout(t0);
  }, [open]);

  if (!open || !mounted) return null;

  const receiptNote =
    receiptDeliveryStatus === "SENT"
      ? t("receiptQueued", { phone: customerPhone || customerName || "" })
      : receiptDeliveryStatus === "FAILED"
        ? t("receiptFailed", { reason: receiptDeliveryError || "delivery failed" })
        : null;

  async function copyReviewLink() {
    if (!reviewUrl) return;
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setReviewCopied(true);
      window.setTimeout(() => setReviewCopied(false), 2000);
    } catch {
      onError?.("Could not copy link");
    }
  }

  async function shareBill() {
    setBusy("share");
    try {
      await api.shareInvoicePdf(invoiceId, undefined, shareBillMessage);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Unable to share bill");
    } finally {
      setBusy(null);
    }
  }

  async function downloadBill() {
    setBusy("download");
    try {
      await api.downloadInvoicePdf(invoiceId);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Unable to download bill");
    } finally {
      setBusy(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex min-h-[100dvh] min-h-[100svh] flex-col walk-in-payment-complete-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-complete-title"
    >
      {showCelebration ? <div className="payment-complete-confetti pointer-events-none" aria-hidden /> : null}

      <div
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 payment-complete-panel",
          showCelebration && "payment-complete-panel-in"
        )}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 payment-complete-check sm:h-16 sm:w-16",
              showCelebration && "payment-complete-check-in"
            )}
          >
            <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.25} />
          </div>

          <h2 id="payment-complete-title" className="mt-3 text-lg font-bold text-emerald-950 dark:text-emerald-50 sm:mt-4 sm:text-xl">
            {t("paymentCompleteShort")}
          </h2>

          <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-emerald-800 dark:text-emerald-100 sm:text-4xl">
            {amountPaidLabel}
          </p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-900/60 dark:text-emerald-200/70">
            {t("paymentAmountPaidLabel")}
          </p>

          {receiptNote ? (
            <p className="mt-2 text-[11px] leading-snug text-emerald-900/55 dark:text-emerald-100/70">{receiptNote}</p>
          ) : null}

          {reviewUrl ? (
            <div className="mt-5 rounded-2xl border border-emerald-200/80 bg-white/90 dark:bg-black/25 dark:border-emerald-900/50 px-4 py-4 shadow-sm">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {reviewSubmittedRating != null
                  ? t("reviewRatedSummary", { rating: reviewSubmittedRating })
                  : t("reviewInviteTitle")}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{t("reviewInviteSubtitle")}</p>
              <button
                type="button"
                onClick={() => void copyReviewLink()}
                className="mt-3 mx-auto flex flex-col items-center gap-2 touch-manipulation"
              >
                <div className="rounded-xl bg-white p-2.5 ring-2 ring-emerald-200/80 shadow-sm sm:p-3">
                  <QRCode value={reviewUrl} size={140} />
                </div>
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                  {reviewCopied ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {t("reviewCopiedLink")}
                    </span>
                  ) : (
                    t("reviewQrTapHint")
                  )}
                </span>
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-emerald-900/70 dark:text-emerald-100/80">{t("paymentCompleteCelebration")}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void shareBill()}
              className="font-semibold text-emerald-800 dark:text-emerald-200 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {busy === "share" ? processingLabel : t("shareBill")}
            </button>
            <span className="text-emerald-400/80">·</span>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void downloadBill()}
              className="font-semibold text-emerald-800 dark:text-emerald-200 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {busy === "download" ? processingLabel : t("downloadBill")}
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-emerald-200/50 bg-emerald-50/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-emerald-900/40 dark:bg-emerald-950/95">
        <button
          type="button"
          className={cn(btnPrimary, "w-full max-w-sm mx-auto min-h-12 bg-emerald-600 hover:bg-emerald-700 block")}
          onClick={onDone}
        >
          {t("done")}
        </button>
      </div>
    </div>,
    document.body
  );
}
