"use client";

import { useState } from "react";
import { Download, Share2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ActionProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
  testId?: string;
};

function ActionChip({ icon, label, onClick, disabled, variant = "default", testId }: ActionProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 touch-manipulation",
        "text-[10px] font-semibold leading-tight transition-colors disabled:opacity-45",
        variant === "danger"
          ? "border-red-200/80 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
        {icon}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </button>
  );
}

export type BookingBillActionBarProps = {
  invoiceId: string;
  filename: string;
  shareText: string;
  shareLabel: string;
  downloadLabel: string;
  processingLabel: string;
  editLabel?: string;
  deleteLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onError?: (message: string) => void;
  downloadTestId?: string;
};

export function BookingBillActionBar({
  invoiceId,
  filename,
  shareText,
  shareLabel,
  downloadLabel,
  processingLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  onError,
  downloadTestId,
}: BookingBillActionBarProps) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const adminMode = !!onEdit && !!onDelete && editLabel && deleteLabel;
  const cols = adminMode ? "grid-cols-4" : "grid-cols-2";

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

  const pdfDisabled = busy != null;

  return (
    <div className={cn("grid w-full gap-1.5", cols)}>
      <ActionChip
        icon={<Share2 />}
        label={busy === "share" ? processingLabel : shareLabel}
        onClick={() => void run("share")}
        disabled={pdfDisabled}
      />
      <ActionChip
        icon={<Download />}
        label={busy === "download" ? processingLabel : downloadLabel}
        onClick={() => void run("download")}
        disabled={pdfDisabled}
        testId={downloadTestId}
      />
      {adminMode ? (
        <>
          <ActionChip icon={<Pencil />} label={editLabel} onClick={onEdit} disabled={pdfDisabled} />
          <ActionChip icon={<Trash2 />} label={deleteLabel} variant="danger" onClick={onDelete} disabled={pdfDisabled} />
        </>
      ) : null}
    </div>
  );
}
