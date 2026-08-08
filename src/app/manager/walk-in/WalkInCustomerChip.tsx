"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export function WalkInCustomerChip({
  name,
  phone,
  onEdit,
}: {
  name: string;
  phone: string;
  onEdit: () => void;
}) {
  const t = useTranslations("manager.walkIn");

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left shadow-sm touch-manipulation hover:border-[var(--brand)] transition"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{name || t("namePlaceholder")}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">{phone || t("phonePlaceholder")}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-[var(--brand-text)]">{t("editCustomer")}</span>
      <ChevronLeft className="w-4 h-4 shrink-0 rotate-180 text-[var(--text-tertiary)]" />
    </button>
  );
}
