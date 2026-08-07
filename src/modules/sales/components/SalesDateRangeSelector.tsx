"use client";

import { DateRangeSelector } from "@/components/DateRangeSelector";
import type { ProductDateRange as SalesDateRange } from "@/lib/date-range";

interface SalesDateRangeSelectorProps {
  value: SalesDateRange;
  onChange: (range: SalesDateRange) => void;
  className?: string;
  testId?: string;
}

/** Sales pipeline toolbar date picker — uses the product-wide DateRangeSelector. */
export function SalesDateRangeSelector(props: SalesDateRangeSelectorProps) {
  return <DateRangeSelector {...props} />;
}
