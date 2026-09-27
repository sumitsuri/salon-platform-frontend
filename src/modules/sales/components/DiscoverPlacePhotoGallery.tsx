"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { salesApi } from "@/modules/sales/api/salesApi";
import { cn } from "@/lib/utils";

const THUMB_MAX_HEIGHT = 160;
const HOVER_MAX_HEIGHT = 320;

type DiscoverPlacePhotoGalleryProps = {
  photoRef?: string;
  photoRefs?: string[];
  alt: string;
  className?: string;
};

function uniqueRefs(photoRef?: string, photoRefs?: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (ref?: string) => {
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    out.push(ref);
  };
  add(photoRef);
  for (const ref of photoRefs ?? []) add(ref);
  return out.slice(0, 3);
}

export function DiscoverPlacePhotoGallery({
  photoRef,
  photoRefs,
  alt,
  className = "",
}: DiscoverPlacePhotoGalleryProps) {
  const refs = useMemo(() => uniqueRefs(photoRef, photoRefs), [photoRef, photoRefs]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [urls, setUrls] = useState<(string | null)[]>(() => refs.map(() => null));
  const [failed, setFailed] = useState<boolean[]>(() => refs.map(() => false));
  const objectUrlsRef = useRef<string[]>([]);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPhoto = useCallback(async (index: number, maxHeight: number) => {
    const ref = refs[index];
    if (!ref) return;
    try {
      const blob = await salesApi.fetchDiscoverPlacePhoto(ref, maxHeight);
      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(objectUrl);
      setUrls((prev) => {
        const next = [...prev];
        next[index] = objectUrl;
        return next;
      });
    } catch {
      setFailed((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    }
  }, [refs]);

  useEffect(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    setActiveIndex(0);
    setHovered(false);
    setUrls(refs.map(() => null));
    setFailed(refs.map(() => false));
    if (refs.length === 0) return;

    void loadPhoto(0, THUMB_MAX_HEIGHT);
    if (refs.length > 1) {
      void loadPhoto(1, THUMB_MAX_HEIGHT);
    }
    if (refs.length > 2) {
      void loadPhoto(2, THUMB_MAX_HEIGHT);
    }

    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, [refs, loadPhoto]);

  useEffect(() => {
    if (!hovered || refs.length <= 1) {
      if (cycleRef.current) {
        clearInterval(cycleRef.current);
        cycleRef.current = null;
      }
      return;
    }
    cycleRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % refs.length);
    }, 1800);
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [hovered, refs.length]);

  useEffect(() => {
    if (!hovered) return;
    const ref = refs[activeIndex];
    if (!ref || urls[activeIndex] || failed[activeIndex]) return;
    void loadPhoto(activeIndex, HOVER_MAX_HEIGHT);
  }, [hovered, activeIndex, refs, urls, failed, loadPhoto]);

  const activeSrc = urls[activeIndex];
  const showPlaceholder = refs.length === 0 || (failed[activeIndex] && !activeSrc);

  return (
    <div
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-lg bg-[var(--surface-muted)]",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setActiveIndex(0);
      }}
    >
      {showPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center text-[var(--ink-muted)]">
          <ImageIcon className="h-6 w-6 opacity-50" aria-hidden />
        </div>
      ) : (
        activeSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeSrc}
            alt={alt}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform",
              hovered ? "scale-100" : "scale-[1.18]"
            )}
          />
        )
      )}

      {refs.length > 1 ? (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/45 to-transparent px-1 pb-1.5 pt-4 transition-opacity duration-200",
              hovered ? "opacity-100" : "opacity-70"
            )}
          >
            {refs.map((_, i) => (
              <span
                key={refs[i]}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activeIndex ? "w-3 bg-white" : "w-1.5 bg-white/55"
                )}
                aria-hidden
              />
            ))}
          </div>
          {!hovered && refs.length > 1 ? (
            <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[9px] font-semibold text-white">
              +{refs.length - 1}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
