"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";

type Props = {
  reviewUrl: string;
  reviewSubmittedRating?: number | null;
  onError?: (message: string) => void;
  /** Larger QR when shown as the primary post-payment CTA */
  prominent?: boolean;
};

export function WalkInReviewInvitePanel({
  reviewUrl,
  reviewSubmittedRating,
  onError,
  prominent = false,
}: Props) {
  const t = useTranslations("manager.walkIn");
  const [reviewCopied, setReviewCopied] = useState(false);

  async function copyReviewLink() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setReviewCopied(true);
      window.setTimeout(() => setReviewCopied(false), 2000);
    } catch {
      onError?.("Could not copy link");
    }
  }

  const qrSize = prominent ? 128 : 96;

  return (
    <div
      className={
        prominent
          ? "rounded-xl border-2 border-[var(--brand)]/25 bg-[var(--brand-light)]/30 p-4 shadow-sm"
          : "rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/90 px-2.5 py-2"
      }
      data-testid="walk-in-review-invite"
    >
      <p className={prominent ? "text-sm font-bold text-[var(--text-primary)]" : "text-xs font-semibold text-[var(--text-secondary)]"}>
        {reviewSubmittedRating != null
          ? t("reviewRatedSummary", { rating: reviewSubmittedRating })
          : t("reviewInviteTitle")}
      </p>
      <button
        type="button"
        onClick={() => void copyReviewLink()}
        className="mt-3 flex w-full flex-col items-center gap-3 text-center touch-manipulation sm:flex-row sm:items-center sm:gap-4 sm:text-left"
      >
        <div className="shrink-0 rounded-xl bg-white p-3 ring-1 ring-[var(--border)] shadow-sm">
          <QRCode value={reviewUrl} size={qrSize} />
        </div>
        <span className="min-w-0 text-sm leading-snug text-[var(--text-secondary)] sm:flex-1">
          {reviewCopied ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" aria-hidden />
              {t("reviewCopiedLink")}
            </span>
          ) : (
            t("reviewQrTapHint")
          )}
        </span>
      </button>
    </div>
  );
}
