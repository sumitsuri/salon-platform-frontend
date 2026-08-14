"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Camera } from "lucide-react";
import { fetchAttendancePhotoBlob } from "@/lib/api";
import { cn } from "@/lib/utils";

const PREVIEW_WIDTH = 300;
const PREVIEW_MAX_HEIGHT = 400;
const PREVIEW_PAD = 12;

interface Props {
  recordId: string;
  type?: "entry" | "exit";
  className?: string;
  alt?: string;
  /** Show enlarged image on hover (desktop) or tap (touch). Default true. */
  preview?: boolean;
}

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function computePreviewPosition(anchor: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchor.right + PREVIEW_PAD;
  let top = anchor.top + anchor.height / 2 - PREVIEW_MAX_HEIGHT / 2;

  if (left + PREVIEW_WIDTH > vw - PREVIEW_PAD) {
    left = anchor.left - PREVIEW_WIDTH - PREVIEW_PAD;
  }
  if (left < PREVIEW_PAD) {
    left = Math.max(PREVIEW_PAD, (vw - PREVIEW_WIDTH) / 2);
  }

  top = Math.max(PREVIEW_PAD, Math.min(top, vh - PREVIEW_MAX_HEIGHT - PREVIEW_PAD));

  return { left, top };
}

export function AttendancePhotoThumb({
  recordId,
  type = "entry",
  className,
  alt = "Attendance photo",
  preview = true,
}: Props) {
  const mounted = useIsMounted();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    fetchAttendancePhotoBlob(recordId, type)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [recordId, type]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updatePreviewPosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPreviewPos(computePreviewPosition(rect));
  }, []);

  const openPreview = useCallback(() => {
    if (!preview || !src) return;
    clearHideTimer();
    updatePreviewPosition();
    setPreviewOpen(true);
  }, [clearHideTimer, preview, src, updatePreviewPosition]);

  const scheduleClosePreview = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => setPreviewOpen(false), 120);
  }, [clearHideTimer]);

  useEffect(() => {
    if (!previewOpen) return;

    function onScrollOrResize() {
      updatePreviewPosition();
    }

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [previewOpen, updatePreviewPosition]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const imgClass = "rounded-lg border border-[var(--border)] object-cover";

  if (failed) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center",
          className
        )}
      >
        <Camera className="w-4 h-4 text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] animate-pulse",
          className
        )}
      />
    );
  }

  const previewPortal =
    mounted && preview && previewOpen && previewPos
      ? createPortal(
          <div
            className="fixed z-[250] pointer-events-auto"
            style={{ left: previewPos.left, top: previewPos.top, width: PREVIEW_WIDTH }}
            onMouseEnter={openPreview}
            onMouseLeave={scheduleClosePreview}
          >
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="block w-full max-h-[400px] object-contain bg-[var(--surface-muted)]"
              />
            </div>
          </div>,
          document.body
        )
      : null;

  if (!preview) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn(imgClass, className)} />
    );
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={cn(
          "inline-block p-0 border-0 bg-transparent touch-manipulation shrink-0 cursor-zoom-in",
          className
        )}
        aria-label={`${alt} — view enlarged`}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClosePreview}
        onFocus={openPreview}
        onBlur={scheduleClosePreview}
        onClick={() => {
          if (previewOpen) {
            setPreviewOpen(false);
          } else {
            openPreview();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={cn(imgClass, "pointer-events-none w-full h-full")} />
      </button>
      {previewPortal}
    </>
  );
}
