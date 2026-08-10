"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DropdownPortalProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  align?: "start" | "end";
  offsetY?: number;
};

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function DropdownPortal({
  open,
  anchorRef,
  children,
  className,
  minWidth = 0,
  align = "start",
  offsetY = 4,
}: DropdownPortalProps) {
  const mounted = useIsMounted();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const width = Math.max(rect.width, minWidth);
      let left = align === "end" ? rect.right - width : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      setCoords({ top: rect.bottom + offsetY, left, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, minWidth, align, offsetY]);

  if (!mounted || !open || !coords) return null;

  return createPortal(
    <div
      className={cn("app-dropdown-portal", className)}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
