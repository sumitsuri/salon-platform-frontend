"use client";

import { SalesDateRange } from "@/modules/sales/lib/date-range";
import { SalesRep } from "@/modules/sales/api/salesApi";
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
    <div
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start"
      data-testid="sales-pipeline-toolbar"
    >
      <SalesDateRangeSelector
        value={dateRange}
        onChange={onDateRangeChange}
        testId={dateTestId}
        className="w-full sm:max-w-sm"
      />
      {showRepFilter && onRepIdsChange && (
        <SalesRepMultiSelect
          reps={reps}
          selectedIds={selectedRepIds}
          onChange={onRepIdsChange}
          className="w-full sm:max-w-sm"
        />
      )}
    </div>
  );
}
