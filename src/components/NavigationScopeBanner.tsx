"use client";

import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { btnSecondarySm } from "@/components/ui";

export function NavigationScopeBanner({
  backHref,
  backLabel,
  title,
  subtitle,
  onClear,
  clearLabel,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  const tCommon = useTranslations("common");

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 sm:flex-row sm:items-center"
      data-testid="navigation-scope-banner"
    >
      <Link
        href={backHref}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-text)] hover:opacity-80 touch-manipulation"
        data-testid="navigation-scope-back"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
        {backLabel}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        {subtitle && <p className="truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {onClear && (
        <button type="button" onClick={onClear} className={`${btnSecondarySm} shrink-0 touch-manipulation`}>
          <X className="h-3.5 w-3.5" />
          {clearLabel ?? tCommon("showAll")}
        </button>
      )}
    </div>
  );
}
