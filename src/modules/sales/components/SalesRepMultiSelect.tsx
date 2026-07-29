"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Users } from "lucide-react";
import { SalesRep } from "@/modules/sales/api/salesApi";
import { cn } from "@/lib/utils";

interface SalesRepMultiSelectProps {
  reps: SalesRep[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function SalesRepMultiSelect({
  reps,
  selectedIds,
  onChange,
  className,
}: SalesRepMultiSelectProps) {
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
    selectedIds.length === 0
      ? "All sales reps"
      : selectedIds.length === 1
        ? reps.find((r) => r.id === selectedIds[0])?.name ?? "1 rep"
        : `${selectedIds.length} reps selected`;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectAll() {
    onChange([]);
  }

  return (
    <div className={cn("relative w-full max-w-sm", className)} ref={ref} data-testid="sales-rep-multi-select">
      <button
        type="button"
        data-testid="sales-rep-multi-select-trigger"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium shadow-sm transition hover:border-[var(--brand)]"
      >
        <Users className="h-4 w-4 shrink-0 text-[var(--brand-text)]" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--ink-muted)] transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          <button
            type="button"
            onClick={selectAll}
            className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                selectedIds.length === 0
                  ? "border-[var(--brand)] bg-[var(--brand)]"
                  : "border-[var(--border)]"
              )}
            >
              {selectedIds.length === 0 && <Check className="h-3 w-3 text-white" />}
            </div>
            All sales reps
          </button>
          {reps.map((rep) => {
            const checked = selectedIds.includes(rep.id);
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => toggle(rep.id)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)]"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--border)]"
                  )}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="truncate">{rep.name}</span>
                <span className="ml-auto truncate text-xs text-[var(--ink-muted)]">{rep.email}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
