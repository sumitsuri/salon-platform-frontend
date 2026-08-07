/**
 * Sales module date-range — re-exports the product-wide standard.
 * @deprecated Import from `@/lib/date-range` in new code.
 */
export {
  type DateRangePreset,
  type ProductDateRange as SalesDateRange,
  DATE_RANGE_PRESET_ORDER,
  DATE_RANGE_PRESET_LABELS,
  DEFAULT_DATE_RANGE_PRESET,
  formatDateRangeLabel,
  formatPresetLabel,
  getDefaultDateRange,
  getLast30DaysRange,
  getLast60DaysRange,
  getRollingDaysRange,
  getTodayRange,
  getYesterdayRange,
  parseDateRangeFromSearchParams,
  dateRangeToSearchParams,
  resolvePresetRange,
  resolveProductDateRange,
  toFromToDates,
  todayIsoDate,
  weekStartFromIso,
} from "@/lib/date-range";
