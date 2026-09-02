"use client";

import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ActiveFilterChip } from "@/components/DataListPanel";
import {
  ActiveScopeChip,
  MobileFilterPanel,
  TableFilterToolbar,
  btnSecondarySm,
} from "@/components/ui";

type FilterColumn = Parameters<typeof MobileFilterPanel>[0]["columns"][number];

type Props = {
  columns: FilterColumn[];
  toolbarClassName?: string;
  showFilters: boolean;
  onShowFiltersChange: (open: boolean) => void;
  activeChips?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  filterButtonTestId?: string;
  clearAllTestId?: string;
};

export function PanelFilterBar({
  columns,
  toolbarClassName,
  showFilters,
  onShowFiltersChange,
  activeChips = [],
  onClearAllFilters,
  filterButtonTestId,
  clearAllTestId,
}: Props) {
  const tAdmin = useTranslations("admin.common");

  return (
    <>
      <div className="data-list-panel-toolbar md:hidden">
        <div className="data-list-panel-controls ml-auto w-full justify-end">
          <button
            type="button"
            className={cn(btnSecondarySm, "relative min-h-9 touch-manipulation")}
            onClick={() => onShowFiltersChange(true)}
            aria-expanded={showFilters}
            data-testid={filterButtonTestId}
          >
            <Filter className="h-4 w-4" />
            {tAdmin("filters")}
            {activeChips.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
                {activeChips.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>

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

      <MobileFilterPanel
        columns={columns}
        open={showFilters}
        onClose={() => onShowFiltersChange(false)}
        title={tAdmin("filters")}
      />

      <div className="hidden md:block">
        <TableFilterToolbar columns={columns} className={toolbarClassName} />
      </div>
    </>
  );
}
