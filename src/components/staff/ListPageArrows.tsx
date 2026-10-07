"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

export function ListPageArrows({ page, totalPages, hasPrev, hasNext, onPrev, onNext, className }: Props) {
  const t = useTranslations("components.ui");

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] disabled:opacity-35 touch-manipulation hover:bg-[var(--surface-muted)]"
        aria-label={t("previousPage")}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-[4rem] text-center text-xs font-bold tabular-nums text-[var(--text-secondary)]">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] disabled:opacity-35 touch-manipulation hover:bg-[var(--surface-muted)]"
        aria-label={t("nextPage")}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
