"use client";

import { cn } from "@/lib/utils";

export function SidebarBrandFooter({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) return null;

  return (
    <div className={cn("px-3 py-2 border-t border-[var(--border)] shrink-0")}>
      <p className="text-[10px] font-bold text-[var(--text-tertiary)] tracking-wide uppercase">AntraHQ</p>
    </div>
  );
}
