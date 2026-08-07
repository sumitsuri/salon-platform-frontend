"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, ChevronDown, Check } from "lucide-react";
import {
  DATE_RANGE_PRESET_ORDER,
  DateRangePreset,
  ProductDateRange,
  formatDateRangeLabel,
  resolvePresetRange,
  resolveProductDateRange,
  todayIsoDate,
} from "@/lib/date-range";
import { selectClass } from "@/components/ui";
import { cn } from "@/lib/utils";

interface DateRangeSelectorProps {
  value: ProductDateRange;
  onChange: (range: ProductDateRange) => void;
  className?: string;
  testId?: string;
}

export function DateRangeSelector({
  value,
  onChange,
  className,
  testId = "date-range",
}: DateRangeSelectorProps) {
  const t = useTranslations("components.dateRange");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const resolved = resolveProductDateRange(value);
  const label = `${t(`periods.${value.preset}`)} · ${formatDateRangeLabel(resolved.from, resolved.to)}`;

  function presetLabel(preset: DateRangePreset): string {
    return t(`periods.${preset}`);
  }

  function applyPreset(preset: DateRangePreset) {
    if (preset === "custom") {
      const seed = resolvePresetRange("last_60_days");
      setDraft({ ...seed, preset: "custom" });
      return;
    }
    const { from, to } = resolvePresetRange(preset);
    onChange({ preset, from, to });
    setOpen(false);
  }

  function applyCustom() {
    if (draft.from && draft.to) {
      onChange({ preset: "custom", from: draft.from, to: draft.to });
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className={cn("relative w-full max-w-sm", className)} data-testid={testId}>
      <button
        type="button"
        data-testid={`${testId}-trigger`}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium shadow-sm transition hover:border-[var(--brand)] touch-manipulation"
      >
        <Calendar className="h-4 w-4 shrink-0 text-[var(--brand-text)]" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--ink-muted)] transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-full min-w-[16rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          {DATE_RANGE_PRESET_ORDER.map((preset) => {
            const active = value.preset === preset;
            const preview = preset !== "custom" ? resolvePresetRange(preset) : null;
            return (
              <button
                key={preset}
                type="button"
                data-testid={`${testId}-preset-${preset}`}
                onClick={() => applyPreset(preset)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)] touch-manipulation"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--border)]",
                  )}
                >
                  {active && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="flex flex-col items-start text-left">
                  <span>{presetLabel(preset)}</span>
                  {preview && (
                    <span className="text-[10px] text-[var(--ink-muted)]">
                      {formatDateRangeLabel(preview.from, preview.to)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {(draft.preset === "custom" || value.preset === "custom") && (
            <div className="space-y-2 border-t border-[var(--border)] px-3 py-3">
              <p className="text-xs font-medium text-[var(--ink-muted)]">{t("customTitle")}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs">
                  {t("customFrom")}
                  <input
                    type="date"
                    data-testid={`${testId}-from`}
                    className={`${selectClass} mt-1`}
                    value={draft.from}
                    max={draft.to || todayIsoDate()}
                    onChange={(e) => setDraft({ ...draft, from: e.target.value, preset: "custom" })}
                  />
                </label>
                <label className="block text-xs">
                  {t("customTo")}
                  <input
                    type="date"
                    data-testid={`${testId}-to`}
                    className={`${selectClass} mt-1`}
                    value={draft.to}
                    min={draft.from || undefined}
                    max={todayIsoDate()}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value, preset: "custom" })}
                  />
                </label>
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 touch-manipulation"
                onClick={applyCustom}
              >
                {t("applyRange")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
