"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UseCaseMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  placeholder?: string;
}

export function UseCaseMultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select use cases",
}: UseCaseMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} use cases selected`;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm font-medium text-[var(--ink)] shadow-sm transition hover:border-violet-400"
      >
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--ink-muted)] transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)]"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-violet-600 bg-violet-600"
                      : "border-[var(--border)]"
                  )}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="truncate text-left">{option}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
