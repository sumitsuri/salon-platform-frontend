"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, Booking, BookingLine } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { SideSheet, AlertBanner, btnPrimary, btnSecondary, inputClass } from "@/components/ui";

type LineDraft = {
  branchServiceId: string;
  staffId: string;
  quantity: number;
  unitPrice: string;
  packageSubscriptionId?: string;
};

function toDraft(line: BookingLine): LineDraft {
  return {
    branchServiceId: line.branchServiceId,
    staffId: line.staffId ?? "",
    quantity: line.quantity ?? 1,
    unitPrice: String(line.unitPrice ?? 0),
    packageSubscriptionId: line.packageSubscriptionId,
  };
}

type Props = {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminBillEditSheet({ booking, open, onClose, onSaved }: Props) {
  const t = useTranslations("admin.bookings");
  const tCommon = useTranslations("common");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLines((booking.lines ?? []).map(toDraft));
    setReason("");
    setError("");
  }, [open, booking]);

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const payload = lines.map((l) => ({
        branchServiceId: l.branchServiceId,
        staffId: l.staffId,
        quantity: Math.max(1, l.quantity),
        unitPrice: Number(l.unitPrice),
        packageSubscriptionId: l.packageSubscriptionId,
      }));
      await api.adminUpdateBill(booking.id, {
        lines: payload,
        reason: reason.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      title={t("editBillTitle")}
      subtitle={booking.customerName ?? undefined}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
            {tCommon("cancel")}
          </button>
          <button type="button" className={btnPrimary} onClick={() => void handleSave()} disabled={saving}>
            {saving ? tCommon("processing") : t("saveBillChanges")}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
        <p className="text-sm text-[var(--text-secondary)]">{t("editBillHint")}</p>
        <ul className="space-y-3">
          {lines.map((line, idx) => {
            const meta = booking.lines?.[idx];
            return (
              <li key={meta?.id ?? idx} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                <p className="font-medium text-sm text-[var(--text-primary)]">{meta?.serviceName ?? "Service"}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-[var(--text-secondary)]">
                    {t("lineQty")}
                    <input
                      className={`${inputClass} mt-1`}
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...line, quantity: Number(e.target.value) || 1 };
                        setLines(next);
                      }}
                      disabled={!!line.packageSubscriptionId}
                    />
                  </label>
                  <label className="text-xs text-[var(--text-secondary)]">
                    {t("linePrice")}
                    <input
                      className={`${inputClass} mt-1`}
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...line, unitPrice: e.target.value };
                        setLines(next);
                      }}
                      disabled={!!line.packageSubscriptionId}
                    />
                  </label>
                </div>
                {line.packageSubscriptionId ? (
                  <p className="text-[11px] text-[var(--text-tertiary)]">{t("packageLineLocked")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {lines.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("editBillNoLines")}</p>
        ) : null}
        <label className="block text-xs text-[var(--text-secondary)]">
          {t("editReasonLabel")}
          <textarea
            className={`${inputClass} mt-1 min-h-[72px]`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("editReasonPlaceholder")}
          />
        </label>
        {booking.billPreview?.grandTotal != null ? (
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("currentGrandTotal", { amount: formatCurrency(booking.billPreview.grandTotal) })}
          </p>
        ) : null}
      </div>
    </SideSheet>
  );
}
