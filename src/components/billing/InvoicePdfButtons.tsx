"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { api } from "@/lib/api";

type Props = {
  invoiceId: string;
  filename?: string;
  shareText?: string;
  downloadLabel: string;
  shareLabel: string;
  processingLabel: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  downloadTestId?: string;
  onError?: (message: string) => void;
};

export function InvoicePdfButtons({
  invoiceId,
  filename,
  shareText,
  downloadLabel,
  shareLabel,
  processingLabel,
  primaryClassName = "",
  secondaryClassName = "",
  downloadTestId,
  onError,
}: Props) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);

  async function run(action: "download" | "share") {
    setBusy(action);
    onError?.("");
    try {
      if (action === "share") {
        await api.shareInvoicePdf(invoiceId, filename, shareText);
      } else {
        await api.downloadInvoicePdf(invoiceId, filename);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Unable to open bill PDF");
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy != null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <button
        type="button"
        onClick={() => void run("share")}
        disabled={disabled}
        className={primaryClassName}
      >
        <Share2 className="w-4 h-4" />
        {busy === "share" ? processingLabel : shareLabel}
      </button>
      <button
        type="button"
        data-testid={downloadTestId}
        onClick={() => void run("download")}
        disabled={disabled}
        className={secondaryClassName}
      >
        <Download className="w-4 h-4" />
        {busy === "download" ? processingLabel : downloadLabel}
      </button>
    </div>
  );
}
