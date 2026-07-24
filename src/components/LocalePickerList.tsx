"use client";

import { cn } from "@/lib/utils";
import type { LocaleInfo } from "@/lib/api";
import type { AppLocale } from "@/i18n/config";

export function groupLocalesByRegion(locales: LocaleInfo[]): Map<string, LocaleInfo[]> {
  const groups = new Map<string, LocaleInfo[]>();
  const sorted = [...locales].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const loc of sorted) {
    const key = loc.regionGroup || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(loc);
  }
  return groups;
}

interface LocalePickerListProps {
  locales: LocaleInfo[];
  selected: AppLocale;
  onSelect: (code: AppLocale) => void;
  compact?: boolean;
}

export function LocalePickerList({ locales, selected, onSelect, compact }: LocalePickerListProps) {
  const groups = groupLocalesByRegion(locales);

  return (
    <div className="space-y-4 max-h-[min(60vh,420px)] overflow-y-auto pr-1">
      {[...groups.entries()].map(([region, items]) => (
        <div key={region}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-1">
            {region}
          </p>
          <div className="space-y-2">
            {items.map((loc) => {
              const isSelected = selected === loc.code;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => onSelect(loc.code as AppLocale)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-xl border text-left transition",
                    compact ? "p-3" : "p-4",
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand-light)]"
                      : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{loc.stateNameNative || loc.stateName}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{loc.stateName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-sm text-[var(--text-primary)]">{loc.nativeLabel}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{loc.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
