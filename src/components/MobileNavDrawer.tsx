"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { SidebarNavPanel, SidebarNavPanelProps } from "@/components/SidebarNavPanel";

interface MobileNavDrawerProps extends SidebarNavPanelProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose, ...panelProps }: MobileNavDrawerProps) {
  const tCommon = useTranslations("common");

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[120] bg-black/40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        className={cn(
          "md:hidden enterprise-sidebar fixed inset-y-0 left-0 z-[130] flex flex-col w-[min(var(--sidebar-width),88vw)] shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        aria-label={tCommon("navigationMenu")}
        aria-hidden={!open}
        role="dialog"
        data-testid="mobile-nav-drawer"
      >
        <div className="flex items-center justify-end px-3 pt-2 shrink-0" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] touch-manipulation"
            aria-label={tCommon("closeMenu")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col flex-1 min-h-0 -mt-2">
          <SidebarNavPanel {...panelProps} collapsed={false} onNavigate={onClose} settingsTestId={open ? "settings-button" : null} />
        </div>
      </aside>
    </>
  );
}
