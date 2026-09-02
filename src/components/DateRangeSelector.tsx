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
import { DropdownPortal } from "@/components/DropdownPortal";

interface DateRangeSelectorProps {
  value: ProductDateRange;
  onChange: (range: ProductDateRange) => void;
  className?: string;
  testId?: string;
  variant?: "surface" | "hero";
}

export function DateRangeSelector({
  value,
  onChange,
  className,
  testId = "date-range",
  variant = "surface",
}: DateRangeSelectorProps) {
  const t = useTranslations("components.dateRange");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const resolved = resolveProductDateRange(value);
  const label = `${t(`periods.${value.preset}`)} · ${formatDateRangeLabel(resolved.from, resolved.to)}`;

  function presetLabel(preset: DateRangePreset): string {
    return t(`periods.${preset}`);
  }

  function applyPreset(preset: DateRangePreset) {
    if (preset === "custom") {
      setDraft((prev) => ({ ...prev, preset: "custom" }));
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

  const presetOptions = DATE_RANGE_PRESET_ORDER.filter((preset) => preset !== "custom");

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-full min-w-0", className)} data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        data-testid={`${testId}-trigger`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className={cn(
          "scope-filter-trigger app-select-trigger touch-manipulation",
          variant === "hero" && "scope-filter-trigger--hero"
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[var(--brand-text)]" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--ink-muted)] transition", open && "rotate-180")}
        />
      </button>

      <DropdownPortal open={open} anchorRef={triggerRef} align="end" minWidth={288}>
        <div
          ref={menuRef}
          className="app-dropdown-menu flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
        >
          <div className="max-h-[min(36dvh,12.5rem)] overflow-y-auto overscroll-contain py-1">
            {presetOptions.map((preset) => {
              const active = value.preset === preset;
              const preview = resolvePresetRange(preset);
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
                      active ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--border)]"
                    )}
                  >
                    {active && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="flex min-w-0 flex-col items-start text-left">
                    <span>{presetLabel(preset)}</span>
                    <span className="text-[10px] text-[var(--ink-muted)]">
                      {formatDateRangeLabel(preview.from, preview.to)}
                    </span>
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              data-testid={`${testId}-preset-custom`}
              onClick={() => applyPreset("custom")}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)] touch-manipulation"
            >
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  value.preset === "custom" || draft.preset === "custom"
                    ? "border-[var(--brand)] bg-[var(--brand)]"
                    : "border-[var(--border)]"
                )}
              >
                {(value.preset === "custom" || draft.preset === "custom") && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              <span>{presetLabel("custom")}</span>
            </button>
          </div>

          <div className="app-dropdown-custom border-t border-[var(--border)] bg-[var(--surface-muted)]/45 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {t("customTitle")}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                {t("customFrom")}
                <input
                  type="date"
                  data-testid={`${testId}-from`}
                  className={`${selectClass} mt-1 min-h-11`}
                  value={draft.from}
                  max={draft.to || todayIsoDate()}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value, preset: "custom" })}
                />
              </label>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                {t("customTo")}
                <input
                  type="date"
                  data-testid={`${testId}-to`}
                  className={`${selectClass} mt-1 min-h-11`}
                  value={draft.to}
                  min={draft.from || undefined}
                  max={todayIsoDate()}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value, preset: "custom" })}
                />
              </label>
            </div>
            <button
              type="button"
              data-testid={`${testId}-apply-custom`}
              className="mt-2.5 w-full min-h-11 rounded-lg bg-[var(--brand)] px-3 py-2.5 text-xs font-semibold text-[var(--brand-on-brand)] hover:opacity-90 touch-manipulation"
              onClick={applyCustom}
            >
              {t("applyRange")}
            </button>
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
}
