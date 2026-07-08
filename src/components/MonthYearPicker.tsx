"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectClass } from "@/components/ui";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseMonth(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return { year, month };
}

function toMonthIso(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function formatMonthYear(iso: string) {
  const { year, month } = parseMonth(iso);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function currentMonthIso() {
  const now = new Date();
  return toMonthIso(now.getFullYear(), now.getMonth() + 1);
}

function addMonths(iso: string, delta: number) {
  const { year, month } = parseMonth(iso);
  const d = new Date(year, month - 1 + delta, 1);
  return toMonthIso(d.getFullYear(), d.getMonth() + 1);
}

interface MonthYearPickerProps {
  value: string;
  onChange: (monthIso: string) => void;
  className?: string;
  maxMonth?: string;
  minYear?: number;
}

export function MonthYearPicker({
  value,
  onChange,
  className,
  maxMonth = currentMonthIso(),
  minYear = 2020,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { year, month } = parseMonth(value);
  const { year: maxYear, month: maxMonthNum } = parseMonth(maxMonth);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);
    return years;
  }, [maxYear, minYear]);

  const canGoNext = value < maxMonth;
  const canGoPrev = year > minYear || month > 1;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const isMonthDisabled = (y: number, m: number) => {
    if (y > maxYear) return true;
    if (y === maxYear && m > maxMonthNum) return true;
    return false;
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm">
        <button
          type="button"
          onClick={() => canGoPrev && onChange(addMonths(value, -1))}
          disabled={!canGoPrev}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-30 transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-muted)] transition min-w-[9.5rem]"
        >
          <Calendar className="w-4 h-4 text-[var(--brand-text)] shrink-0" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{formatMonthYear(value)}</span>
        </button>

        <button
          type="button"
          onClick={() => canGoNext && onChange(addMonths(value, 1))}
          disabled={!canGoNext}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-30 transition"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,18rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg p-4">
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Year</label>
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              const m = isMonthDisabled(y, month) ? Math.min(maxMonthNum, 12) : month;
              onChange(toMonthIso(y, y === maxYear && m > maxMonthNum ? maxMonthNum : m));
            }}
            className={cn(selectClass, "mb-4")}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Month</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((label, idx) => {
              const m = idx + 1;
              const disabled = isMonthDisabled(year, m);
              const active = m === month;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(toMonthIso(year, m));
                    setOpen(false);
                  }}
                  className={cn(
                    "py-2 text-xs font-semibold rounded-lg transition",
                    active
                      ? "bg-[var(--brand)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                    disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { currentMonthIso, formatMonthYear, toMonthIso, parseMonth, addMonths };

interface YearPickerProps {
  value: number;
  onChange: (year: number) => void;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

export function YearPicker({
  value,
  onChange,
  className,
  minYear = 2020,
  maxYear = parseMonth(currentMonthIso()).year,
}: YearPickerProps) {
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [maxYear, minYear]);

  return (
    <div className={cn("flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm", className)}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= minYear}
        className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-30 transition"
        aria-label="Previous year"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-sm font-semibold text-[var(--text-primary)] bg-transparent border-0 px-3 py-2 focus:outline-none cursor-pointer"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= maxYear}
        className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-30 transition"
        aria-label="Next year"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
