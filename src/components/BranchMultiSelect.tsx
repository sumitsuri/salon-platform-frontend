"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Branch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BranchMultiSelectProps {
  branches: Branch[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function BranchMultiSelect({ branches, selected, onChange }: BranchMultiSelectProps) {
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
    ? "All Branches"
    : selected.length === 0
    ? "No branches selected"
    : `${selected.length} branch${selected.length > 1 ? "es" : ""} selected`;

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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-300 shadow-sm transition min-w-[180px]"
      >
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100"
          >
            <div className={cn("w-4 h-4 rounded border flex items-center justify-center",
              allSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300")}>
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="font-medium">All Branches</span>
          </button>
          {branches.map((b) => {
            const checked = selected.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggle(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center",
                  checked ? "bg-indigo-600 border-indigo-600" : "border-slate-300")}>
                  {checked && <Check className="w-3 h-3 text-white" />}
                </div>
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
