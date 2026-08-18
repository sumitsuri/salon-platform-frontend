"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, formatMoney, cn } from "@/lib/utils";

interface WalkInEditablePriceButtonProps {
  amount: number;
  localeKit: TenantLocaleKit;
  onEdit: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function WalkInEditablePriceButton({
  amount,
  localeKit,
  onEdit,
  disabled,
  className,
  size = "sm",
}: WalkInEditablePriceButtonProps) {
  const t = useTranslations("manager.walkIn");
  const display = size === "md" ? formatMoney(amount, localeKit) : formatCurrency(amount, localeKit);

  if (disabled) {
    return (
      <span className={cn("font-semibold tabular-nums text-[var(--text-primary)]", size === "md" ? "text-sm" : "text-sm", className)}>
        {display}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-semibold tabular-nums text-[var(--brand-text)] shadow-sm touch-manipulation hover:bg-[var(--surface-muted)] active:scale-[0.98] transition",
        size === "md" ? "text-sm min-h-9 px-2.5" : "text-sm min-h-8",
        className
      )}
      aria-label={t("editPrice")}
    >
      {display}
      <Pencil className={cn("shrink-0 opacity-70", size === "md" ? "h-3.5 w-3.5" : "h-3 w-3")} aria-hidden />
    </button>
  );
}
