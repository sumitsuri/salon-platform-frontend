"use client";

import { ReactNode } from "react";
import { Filter, LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ActiveScopeChip, MobileFilterPanel, btnSecondarySm } from "@/components/ui";

type ColumnFilter = Parameters<typeof MobileFilterPanel>[0]["columns"][number]["filter"];

export type DataListFilterColumn = {
  label: string;
  filter?: ColumnFilter;
};

export type ActiveFilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

type SectionIconVariant = "metrics" | "accent" | "default";

type Props = {
  id?: string;
  testId?: string;
  className?: string;
  icon: LucideIcon;
  iconVariant?: SectionIconVariant;
  title: string;
  hint?: string;
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  activeChips?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  filterColumns?: DataListFilterColumn[];
  showFilters?: boolean;
  onShowFiltersChange?: (open: boolean) => void;
  activeFilterCount?: number;
  filterPanelTitle?: string;
  filterButtonTestId?: string;
  clearAllTestId?: string;
  children: ReactNode;
};

const iconVariantClass: Record<SectionIconVariant, string> = {
  metrics: "dashboard-overview-section-icon--metrics",
  accent: "dashboard-overview-section-icon--accent",
  default: "dashboard-overview-section-icon",
};

export function DataListPanel({
  id,
  testId,
  className,
  icon: Icon,
  iconVariant = "metrics",
  title,
  hint,
  toolbarStart,
  toolbarEnd,
  activeChips = [],
  onClearAllFilters,
  filterColumns,
  showFilters = false,
  onShowFiltersChange,
  activeFilterCount = 0,
  filterPanelTitle,
  filterButtonTestId,
  clearAllTestId,
  children,
}: Props) {
  const tAdmin = useTranslations("admin.common");
  const showMobileFilterButton = !!filterColumns && !!onShowFiltersChange;
  const showToolbar = toolbarStart || toolbarEnd || showMobileFilterButton;
  const toolbarMobileOnly = showToolbar && !toolbarStart && !toolbarEnd;

  return (
    <section
      id={id}
      data-testid={testId}
      className={cn("dashboard-widget-card data-list-panel scroll-mt-24 min-w-0 max-w-full", className)}
    >
      <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
        <span
          className={cn("dashboard-overview-section-icon", iconVariantClass[iconVariant])}
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="dashboard-overview-section-title">{title}</h2>
          {hint ? <p className="dashboard-overview-section-hint">{hint}</p> : null}
        </div>
      </div>

      {showToolbar ? (
        <div className={cn("data-list-panel-toolbar", toolbarMobileOnly && "md:hidden")}>
          {toolbarStart}
          <div className="data-list-panel-controls">
            {toolbarEnd}
            {showMobileFilterButton ? (
              <button
                type="button"
                className={cn(btnSecondarySm, "relative min-h-9 touch-manipulation md:hidden")}
                onClick={() => onShowFiltersChange(true)}
                aria-expanded={showFilters}
                data-testid={filterButtonTestId}
              >
                <Filter className="h-4 w-4" />
                {tAdmin("filters")}
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeChips.length > 0 ? (
        <div className="data-list-panel-active-filters">
          {activeChips.map((chip) => (
            <ActiveScopeChip key={chip.key} label={chip.label} onClear={chip.onClear} />
          ))}
          {onClearAllFilters ? (
            <button
              type="button"
              className="data-list-panel-clear-all touch-manipulation"
              onClick={onClearAllFilters}
              data-testid={clearAllTestId}
            >
              {tAdmin("clearFilters")}
            </button>
          ) : null}
        </div>
      ) : null}

      {showMobileFilterButton ? (
        <MobileFilterPanel
          columns={filterColumns}
          open={showFilters}
          onClose={() => onShowFiltersChange(false)}
          title={filterPanelTitle ?? tAdmin("filters")}
        />
      ) : null}

      {children}
    </section>
  );
}
