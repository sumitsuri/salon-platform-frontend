"use client";

import type { ReactNode } from "react";
import { Branch } from "@/lib/api";
import { ProductDateRange } from "@/lib/date-range";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { cn } from "@/lib/utils";

export type ScopeFilterVariant = "surface" | "hero";

export function ScopeFilterBar({
  variant = "surface",
  layout = "inline",
  className,
  showDate = true,
  showBranch = true,
  dateRange,
  onDateRangeChange,
  dateTestId,
  branches,
  selectedBranches,
  onBranchesChange,
  dateControl,
  branchControl,
}: {
  variant?: ScopeFilterVariant;
  /** Card wraps the bar on light pages; inline sits flush (e.g. dashboard header). */
  layout?: "inline" | "card";
  className?: string;
  showDate?: boolean;
  showBranch?: boolean;
  dateRange?: ProductDateRange;
  onDateRangeChange?: (range: ProductDateRange) => void;
  dateTestId?: string;
  branches?: Branch[];
  selectedBranches?: string[];
  onBranchesChange?: (ids: string[]) => void;
  dateControl?: ReactNode;
  branchControl?: ReactNode;
}) {
  const dateSlot =
    showDate &&
    (dateControl ??
      (dateRange && onDateRangeChange ? (
        <DateRangeSelector
          variant={variant}
          value={dateRange}
          onChange={onDateRangeChange}
          testId={dateTestId ?? "scope-date-range"}
        />
      ) : null));

  const branchSlot =
    showBranch &&
    (branchControl ??
      (branches && selectedBranches && onBranchesChange ? (
        <BranchMultiSelect
          variant={variant}
          branches={branches}
          selected={selectedBranches}
          onChange={onBranchesChange}
        />
      ) : null));

  if (!dateSlot && !branchSlot) return null;

  const bar = (
    <div
      className={cn(
        "scope-filter-bar",
        variant === "hero" && "scope-filter-bar--hero",
        layout === "card" && "scope-filter-bar--card",
        className
      )}
      data-testid="scope-filter-bar"
    >
      {dateSlot ? <div className="scope-filter-bar-slot">{dateSlot}</div> : null}
      {branchSlot ? <div className="scope-filter-bar-slot">{branchSlot}</div> : null}
    </div>
  );

  return bar;
}
