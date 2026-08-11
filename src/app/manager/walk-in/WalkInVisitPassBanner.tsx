"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CustomerRegistrationCard } from "@/lib/api";
import { RegistrationCardPanel } from "@/components/customer/RegistrationCardPanel";
import { btnSecondary } from "@/components/ui";

export function WalkInVisitPassBanner({
  visitPassId,
  customerName,
  card,
  step,
  onEdit,
  highlightScreenshot,
}: {
  visitPassId: string;
  customerName: string;
  card?: CustomerRegistrationCard | null;
  step: number;
  onEdit?: () => void;
  /** Step 3 — expand card by default so the customer can screenshot */
  highlightScreenshot?: boolean;
}) {
  const t = useTranslations("manager.walkIn");
  const [expanded, setExpanded] = useState(highlightScreenshot ?? step >= 3);

  if (!visitPassId.trim()) return null;

  return (
    <div
      className="rounded-2xl border border-[var(--brand)]/25 bg-[var(--surface)] shadow-sm overflow-hidden"
      data-testid="walk-in-visit-pass-banner"
    >
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {t("visitPassLabel")}
          </p>
          <p className="text-lg sm:text-xl font-bold font-mono tracking-wide text-[var(--text-primary)] truncate">
            {visitPassId}
          </p>
          {customerName && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate mt-0.5">{customerName}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {card && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`${btnSecondary} py-2 px-3 text-xs min-h-10 touch-manipulation`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t("hideVisitPassCard")}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t("showVisitPassCard")}
                </>
              )}
            </button>
          )}
          {onEdit && step > 1 && (
            <button
              type="button"
              onClick={onEdit}
              className={`${btnSecondary} py-2 px-3 text-xs min-h-10 touch-manipulation`}
            >
              <Pencil className="w-4 h-4" />
              {t("editCustomer")}
            </button>
          )}
        </div>
      </div>

      {highlightScreenshot && !expanded && (
        <p className="px-3 pb-3 text-xs text-[var(--text-tertiary)] sm:px-4">{t("visitPassScreenshotHint")}</p>
      )}

      {card && expanded && (
        <div className="border-t border-[var(--border)] px-3 py-3 sm:px-4 bg-[var(--surface-muted)]/30">
          <RegistrationCardPanel card={card} />
        </div>
      )}
    </div>
  );
}
