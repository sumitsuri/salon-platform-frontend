"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { formatDateRangeLabel } from "@/lib/date-range";
import {
  getManagerCurrentMonthRange,
  getManagerLastMonthRange,
  getManagerHomeDefaultRange,
  managerHomeSelectableMaxDate,
  managerHomeSelectableMinDate,
  resolveManagerHomeRange,
  type ManagerHomeDatePreset,
  type ManagerHomeDateRange,
} from "@/lib/manager-home-date-range";
import { cn } from "@/lib/utils";
import { DropdownPortal } from "@/components/DropdownPortal";

const PRESETS: ManagerHomeDatePreset[] = ["today", "current_month", "last_month"];

type Props = {
  value: ManagerHomeDateRange;
  onChange: (range: ManagerHomeDateRange) => void;
  className?: string;
  testId?: string;
};

export function ManagerHomeDateSelector({ value, onChange, className, testId = "manager-home-date" }: Props) {
  const t = useTranslations("manager.home.dateRange");
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

  const resolved = resolveManagerHomeRange(value);
  const label = formatDateRangeLabel(resolved.from, resolved.to);
  const hint =
    value.preset === "today"
      ? t("hintToday")
      : value.preset === "current_month"
        ? t("hintCurrentMonth")
        : value.preset === "last_month"
          ? t("hintLastMonth")
          : t("hintCustom");

  function applyPreset(preset: ManagerHomeDatePreset) {
    if (preset === "today") {
      onChange(getManagerHomeDefaultRange());
    } else if (preset === "current_month") {
      onChange({ preset, ...getManagerCurrentMonthRange() });
    } else if (preset === "last_month") {
      onChange({ preset, ...getManagerLastMonthRange() });
    }
    setOpen(false);
  }

  function applyCustom() {
    if (!draft.from || !draft.to) return;
    const min = managerHomeSelectableMinDate();
    const max = managerHomeSelectableMaxDate();
    let from = draft.from;
    let to = draft.to;
    if (from < min) from = min;
    if (to > max) to = max;
    if (from > to) from = to;
    onChange({ preset: "custom", from, to });
    setOpen(false);
  }

  function presetPreview(preset: ManagerHomeDatePreset) {
    if (preset === "today") return getManagerHomeDefaultRange();
    if (preset === "current_month") return { preset, ...getManagerCurrentMonthRange() };
    return { preset, ...getManagerLastMonthRange() };
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)} data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className="manager-home-date-trigger touch-manipulation"
      >
        <Calendar className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="block text-xs font-semibold text-[var(--text-primary)]">{label}</span>
          <span className="block text-[10px] font-medium text-[var(--text-secondary)]">{hint}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition", open && "rotate-180")} />
      </button>

      <DropdownPortal open={open} anchorRef={triggerRef} align="end" minWidth={288}>
        <div
          ref={menuRef}
          className="app-dropdown-menu flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
        >
          <div className="max-h-[min(40dvh,14rem)] overflow-y-auto overscroll-contain py-1">
            {PRESETS.map((preset) => {
              const active = value.preset === preset;
              const preview = presetPreview(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)] touch-manipulation"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      active ? "border-teal-600 bg-teal-600" : "border-[var(--border)]"
                    )}
                  >
                    {active ? <Check className="h-3 w-3 text-white" /> : null}
                  </div>
                  <span className="flex min-w-0 flex-col items-start text-left">
                    <span>{t(`presets.${preset}`)}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {formatDateRangeLabel(preview.from, preview.to)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-[var(--border)] px-3 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)]">{t("customLabel")}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-medium text-[var(--text-secondary)]">
                {t("from")}
                <input
                  type="date"
                  min={managerHomeSelectableMinDate()}
                  max={managerHomeSelectableMaxDate()}
                  value={draft.from}
                  onChange={(e) => setDraft((p) => ({ ...p, preset: "custom", from: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs"
                />
              </label>
              <label className="text-[10px] font-medium text-[var(--text-secondary)]">
                {t("to")}
                <input
                  type="date"
                  min={managerHomeSelectableMinDate()}
                  max={managerHomeSelectableMaxDate()}
                  value={draft.to}
                  onChange={(e) => setDraft((p) => ({ ...p, preset: "custom", to: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={applyCustom}
              className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white touch-manipulation"
            >
              {t("applyCustom")}
            </button>
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
}
