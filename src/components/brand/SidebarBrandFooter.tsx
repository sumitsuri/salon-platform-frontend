"use client";

import { cn } from "@/lib/utils";

export function SidebarBrandFooter({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) return null;

  return (
    <div className={cn("px-3 py-2.5 border-t border-[var(--border)] shrink-0")}>
      <div className="flex items-center gap-2 rounded-lg bg-[var(--gradient-brand-soft)] px-2.5 py-2 ring-1 ring-[var(--border-brand)]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--gradient-brand)] text-[10px] font-bold text-white shadow-sm">
          A
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-wide text-[var(--brand-text)]">Antrahq</p>
          <p className="text-[9px] text-[var(--text-tertiary)] truncate">Every location in sync</p>
        </div>
      </div>
    </div>
  );
}
