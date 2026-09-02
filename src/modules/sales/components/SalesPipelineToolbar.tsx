"use client";

import { SalesDateRange } from "@/modules/sales/lib/date-range";
import { SalesRep } from "@/modules/sales/api/salesApi";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { SalesDateRangeSelector } from "@/modules/sales/components/SalesDateRangeSelector";
import { SalesRepMultiSelect } from "@/modules/sales/components/SalesRepMultiSelect";

interface SalesPipelineToolbarProps {
  dateRange: SalesDateRange;
  onDateRangeChange: (range: SalesDateRange) => void;
  showRepFilter?: boolean;
  reps?: SalesRep[];
  selectedRepIds?: string[];
  onRepIdsChange?: (ids: string[]) => void;
  dateTestId?: string;
}

export function SalesPipelineToolbar({
  dateRange,
  onDateRangeChange,
  showRepFilter = false,
  reps = [],
  selectedRepIds = [],
  onRepIdsChange,
  dateTestId = "pipeline-date-range",
}: SalesPipelineToolbarProps) {
  return (
    <ScopeFilterBar
      layout="card"
      className="max-w-full sm:max-w-xl"
      dateControl={
        <SalesDateRangeSelector
          value={dateRange}
          onChange={onDateRangeChange}
          testId={dateTestId}
        />
      }
      showBranch={showRepFilter}
      branchControl={
        showRepFilter && onRepIdsChange ? (
          <SalesRepMultiSelect reps={reps} selectedIds={selectedRepIds} onChange={onRepIdsChange} />
        ) : undefined
      }
    />
  );
}
