"use client";

import { FileText } from "lucide-react";

export function WhatsAppBubblePreview({
  bodyText,
  headerPreview,
  hasDocumentHeader,
  timeLabel = "12:04 PM",
}: {
  bodyText: string;
  headerPreview?: string;
  hasDocumentHeader?: boolean;
  timeLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-[var(--border)] bg-[#e5ddd5] dark:bg-[#0b141a] p-4 shadow-inner">
        <div className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-[#dcf8c6] dark:bg-[#005c4b] px-3 py-2.5 shadow-sm">
          {hasDocumentHeader && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-black/5 bg-white/70 dark:bg-black/20 px-2.5 py-2">
              <FileText className="w-5 h-5 text-red-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {headerPreview ?? "invoice.pdf"}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">PDF · Document</p>
              </div>
            </div>
          )}
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{bodyText}</p>
          <p className="text-[10px] text-[var(--text-tertiary)] text-right mt-1 tabular-nums">{timeLabel} ✓✓</p>
        </div>
      </div>
    </div>
  );
}
