"use client";

import { useState } from "react";
import { Check, Copy, QrCode, Share2 } from "lucide-react";
import QRCode from "react-qr-code";
import { btnSecondary } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
  reviewUrl: string;
  title: string;
  subtitle: string;
  copyLabel: string;
  copiedLabel: string;
  shareLabel: string;
  submittedRating?: number | null;
  compact?: boolean;
};

export function ReviewInvitationPanel({
  reviewUrl,
  title,
  subtitle,
  copyLabel,
  copiedLabel,
  shareLabel,
  submittedRating,
  compact = false,
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

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="shrink-0 rounded-md bg-white p-1.5 ring-1 ring-[var(--border)]">
          <QRCode value={reviewUrl} size={88} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{title}</p>
          {submittedRating != null ? (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Rated {submittedRating}/5</p>
          ) : (
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{subtitle}</p>
          )}
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => void copyLink()}
              className={cn(btnSecondary, "min-h-9 flex-1 px-2 py-1.5 text-[11px] justify-center gap-1")}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? copiedLabel : copyLabel}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              className={cn(btnSecondary, "min-h-9 flex-1 px-2 py-1.5 text-[11px] justify-center gap-1")}
            >
              <Share2 className="w-3 h-3" />
              {shareLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <QrCode className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{subtitle}</p>
          {submittedRating != null && (
            <p className="text-xs font-medium text-[var(--text-primary)] mt-1.5">
              Customer rated {submittedRating}/5
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-[var(--border)]">
          <QRCode value={reviewUrl} size={136} />
        </div>
        <div className="w-full min-w-0 space-y-2">
          <p className="hidden sm:block text-[11px] break-all text-[var(--text-tertiary)]">{reviewUrl}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className={`${btnSecondary} w-full min-h-11 text-xs justify-center py-2.5`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? copiedLabel : copyLabel}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              className={`${btnSecondary} w-full min-h-11 text-xs justify-center py-2.5`}
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
