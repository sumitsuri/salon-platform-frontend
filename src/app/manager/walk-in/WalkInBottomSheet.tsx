"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";

interface WalkInBottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function WalkInBottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: WalkInBottomSheetProps) {
  const tCommon = useTranslations("common");
  const mounted = useIsMounted();

  useScrollLock(open);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[140] bg-black/45"
        aria-label={tCommon("close")}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[150] flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl pb-[env(safe-area-inset-bottom,0px)]",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5 shrink-0">
          <p className="font-bold text-sm text-[var(--text-primary)] min-w-0 truncate">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-muted)] touch-manipulation shrink-0"
            aria-label={tCommon("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain touch-scroll-y px-4 py-3 min-h-0 flex-1" data-touch-scroll>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </>,
    document.body
  );
}
