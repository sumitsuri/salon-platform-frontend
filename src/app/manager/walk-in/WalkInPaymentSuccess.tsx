"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { btnPrimary, btnSecondary } from "@/components/ui";
import type { CustomerRegistrationCard } from "@/lib/api";
import { RegistrationCardPanel } from "@/components/customer/RegistrationCardPanel";

type Props = {
  invoiceId: string;
  shareBillMessage: string;
  customerName: string;
  reviewUrl?: string;
  reviewSubmittedRating?: number | null;
  registrationCard?: CustomerRegistrationCard | null;
  processingLabel: string;
  onError?: (message: string) => void;
  onDone: () => void;
  onViewHistory: () => void;
};

export function WalkInPaymentSuccess({
  invoiceId,
  shareBillMessage,
  reviewUrl,
  reviewSubmittedRating,
  registrationCard,
  processingLabel,
  onError,
  onDone,
  onViewHistory,
}: Props) {
  const t = useTranslations("manager.walkIn");
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [reviewCopied, setReviewCopied] = useState(false);

  async function shareBill() {
    setBusy("share");
    onError?.("");
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
    onError?.("");
    try {
      await api.downloadInvoicePdf(invoiceId);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Unable to download bill");
    } finally {
      setBusy(null);
    }
  }

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

  const disabled = busy != null;

  return (
    <div className="space-y-3 pt-1">
      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/35 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{t("paymentCompleteShort")}</p>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
          <button
            type="button"
            onClick={() => void shareBill()}
            disabled={disabled}
            className="font-semibold text-[var(--brand-text)] touch-manipulation disabled:opacity-50 hover:underline"
          >
            {busy === "share" ? processingLabel : t("shareBill")}
          </button>
          <span className="text-[var(--text-tertiary)]" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => void downloadBill()}
            disabled={disabled}
            className="font-semibold text-[var(--brand-text)] touch-manipulation disabled:opacity-50 hover:underline"
          >
            {busy === "download" ? processingLabel : t("downloadBill")}
          </button>
        </p>

        {reviewUrl && (
          <div className="mt-2.5 rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/90 px-2.5 py-2">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              {reviewSubmittedRating != null
                ? t("reviewRatedSummary", { rating: reviewSubmittedRating })
                : t("reviewInviteTitle")}
            </p>
            <button
              type="button"
              onClick={() => void copyReviewLink()}
              className="mt-2 flex w-full items-center gap-2.5 text-left touch-manipulation"
            >
              <div className="shrink-0 rounded-md bg-white p-1 ring-1 ring-[var(--border)]">
                <QRCode value={reviewUrl} size={64} />
              </div>
              <span className="min-w-0 text-[11px] leading-snug text-[var(--text-secondary)]">
                {reviewCopied ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {t("reviewCopiedLink")}
                  </span>
                ) : (
                  t("reviewQrTapHint")
                )}
              </span>
            </button>
          </div>
        )}

        {registrationCard && (
          <details className="group mt-2 rounded-lg border border-emerald-200/60 bg-white/40 dark:border-emerald-900/40 dark:bg-black/10">
            <summary className="cursor-pointer list-none px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] touch-manipulation">
              {t("visitPassSaveReminder")}
            </summary>
            <div className="border-t border-emerald-200/50 px-2.5 py-2 dark:border-emerald-900/40">
              <RegistrationCardPanel card={registrationCard} />
            </div>
          </details>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onViewHistory}
          className={`${btnSecondary} min-h-11 touch-manipulation px-3 text-xs sm:px-5 sm:text-sm`}
        >
          <span className="truncate">{t("viewBookings")}</span>
        </button>
        <button
          type="button"
          onClick={onDone}
          className={`${btnPrimary} min-h-11 touch-manipulation px-3 text-xs sm:px-5 sm:text-sm`}
        >
          {t("done")}
        </button>
      </div>
    </div>
  );
}
