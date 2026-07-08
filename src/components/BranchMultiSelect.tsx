"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Branch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BranchMultiSelectProps {
  branches: Branch[];
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function BranchMultiSelect({ branches, selected, onChange, className }: BranchMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allSelected = selected.length === branches.length;
  const label = allSelected
    ? "All branches"
    : selected.length === 0
      ? "Select branches"
      : `${selected.length} branch${selected.length > 1 ? "es" : ""}`;

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function toggleAll() {
    onChange(allSelected ? [] : branches.map((b) => b.id));
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3.5 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:border-[var(--brand)] shadow-sm transition"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown className={cn("w-4 h-4 text-[var(--text-tertiary)] shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 lg:right-auto lg:min-w-[16rem] mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]"
          >
            <div
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                allSelected ? "bg-[var(--brand)] border-[var(--brand)]" : "border-[var(--border-strong)]"
              )}
            >
              {allSelected && <Check className="w-3 h-3 text-[var(--brand-on-brand)]" />}
            </div>
            <span className="font-medium">All branches</span>
          </button>
          {branches.map((b) => {
            const checked = selected.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggle(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)] text-[var(--text-primary)]"
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                    checked ? "bg-[var(--brand)] border-[var(--brand)]" : "border-[var(--border-strong)]"
                  )}
                >
                  {checked && <Check className="w-3 h-3 text-[var(--brand-on-brand)]" />}
                </div>
                <span className="truncate">{b.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
