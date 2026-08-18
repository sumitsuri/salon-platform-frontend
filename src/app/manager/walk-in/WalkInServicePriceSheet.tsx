"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { WalkInBottomSheet } from "./WalkInBottomSheet";
import { WalkInCartItem, walkInCartLinePrice } from "./walk-in-types";

interface WalkInServicePriceSheetProps {
  open: boolean;
  item: WalkInCartItem | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (finalPrice: number) => void;
}

export function WalkInServicePriceSheet({
  open,
  item,
  saving,
  onClose,
  onSave,
}: WalkInServicePriceSheetProps) {
  const t = useTranslations("manager.walkIn");
  const tCommon = useTranslations("common");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setRaw(String(walkInCartLinePrice(item)));
    setError("");
  }, [open, item]);

  if (!item) return null;

  const minPrice = item.basePrice;
  const parsed = Number(raw);
  const valid = Number.isFinite(parsed) && parsed >= minPrice;

  function submit() {
    if (!valid) {
      setError(t("priceTooLow"));
      return;
    }
    onSave(parsed);
  }

  const inner = (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-3">
        <p className="font-semibold text-[var(--text-primary)]">{item.serviceName}</p>
        <p className="mt-2 text-xs text-[var(--text-tertiary)] leading-snug">{t("editPriceHint")}</p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{t("servicePrice")}</span>
        <input
          type="number"
          inputMode="decimal"
          min={minPrice}
          step={1}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setError("");
          }}
          className={cn(inputClass, "min-h-12 text-lg font-semibold tabular-nums text-right")}
          autoFocus
          aria-label={t("servicePrice")}
        />
      </label>

      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className={`${btnSecondary} flex-1 min-h-11`}>
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || saving}
          className={`${btnPrimary} flex-1 min-h-11`}
        >
          {saving ? tCommon("processing") : t("savePrice")}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">
        {open ? (
          <>
            <button type="button" className="fixed inset-0 z-[140] bg-black/45" aria-label={tCommon("close")} onClick={onClose} />
            <div
              className="fixed left-1/2 top-1/2 z-[150] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={t("editPriceTitle")}
            >
              <p className="mb-4 font-bold text-[var(--text-primary)]">{t("editPriceTitle")}</p>
              {inner}
            </div>
          </>
        ) : null}
      </div>
      <div className="lg:hidden">
        <WalkInBottomSheet open={open} title={t("editPriceTitle")} onClose={onClose}>
          {inner}
        </WalkInBottomSheet>
      </div>
    </>
  );
}
