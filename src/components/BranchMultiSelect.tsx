"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import { Branch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DropdownPortal } from "@/components/DropdownPortal";

interface BranchMultiSelectProps {
  branches: Branch[];
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

function resolveBranchLabel(
  branches: Branch[],
  selected: string[],
  t: (key: string, values?: { count: number }) => string
): string {
  if (branches.length === 0) return t("selectBranches");
  if (selected.length === 0) return t("selectBranches");

  if (selected.length === 1) {
    const branch = branches.find((b) => b.id === selected[0]);
    if (branch) return branch.name;
  }

  if (selected.length === branches.length) {
    return branches.length === 1 ? branches[0].name : t("allBranches");
  }

  return t("branchCount", { count: selected.length });
}

export function BranchMultiSelect({ branches, selected, onChange, className }: BranchMultiSelectProps) {
  const t = useTranslations("components.branchMultiSelect");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const allSelected = branches.length > 0 && selected.length === branches.length;
  const label = useMemo(() => resolveBranchLabel(branches, selected, t), [branches, selected, t]);

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
    <div className={cn("relative w-full max-w-full min-w-0", className)} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className="app-select-trigger flex min-h-11 w-full min-w-0 max-w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:border-[var(--brand)] touch-manipulation"
      >
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition", open && "rotate-180")} />
      </button>

      <DropdownPortal open={open} anchorRef={triggerRef} minWidth={240}>
        <div
          ref={menuRef}
          role="listbox"
          className="app-dropdown-menu max-h-[min(70dvh,18rem)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
        >
          {branches.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-muted)] touch-manipulation"
            >
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  allSelected ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--border-strong)]"
                )}
              >
                {allSelected && <Check className="h-3 w-3 text-[var(--brand-on-brand)]" />}
              </div>
              <span className="font-medium">{t("allBranches")}</span>
            </button>
          )}
          {branches.map((b) => {
            const checked = selected.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(b.id)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-muted)] touch-manipulation"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--border-strong)]"
                  )}
                >
                  {checked && <Check className="h-3 w-3 text-[var(--brand-on-brand)]" />}
                </div>
                <span className="truncate text-left">{b.name}</span>
              </button>
            );
          })}
        </div>
      </DropdownPortal>
    </div>
  );
}
