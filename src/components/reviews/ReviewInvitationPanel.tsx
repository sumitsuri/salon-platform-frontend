"use client";

import { useState } from "react";
import { Check, Copy, QrCode, Share2 } from "lucide-react";
import QRCode from "react-qr-code";

type Props = {
  reviewUrl: string;
  title: string;
  subtitle: string;
  copyLabel: string;
  copiedLabel: string;
  shareLabel: string;
  submittedRating?: number | null;
};

export function ReviewInvitationPanel({
  reviewUrl,
  title,
  subtitle,
  copyLabel,
  copiedLabel,
  shareLabel,
  submittedRating,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: subtitle, url: reviewUrl });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    void copyLink();
  }

  return (
    <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-white dark:bg-emerald-950/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 p-2">
          <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{title}</p>
          <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70">{subtitle}</p>
          {submittedRating != null && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-1">
              Customer rated {submittedRating}/5
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/5">
          <QRCode value={reviewUrl} size={128} />
        </div>
        <div className="w-full space-y-2">
          <p className="text-[11px] break-all text-muted-foreground">{reviewUrl}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium min-h-10"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? copiedLabel : copyLabel}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium min-h-10"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
