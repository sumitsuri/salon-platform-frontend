"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Sizes an element to the space actually left on screen below it, so a chat can fill the page on any device:
 * it follows window resizes, rotation and the on-screen keyboard (visualViewport), and leaves the bottom padding
 * the surrounding page already uses. {@code disabled} hands sizing to CSS (for the full-screen mode).
 */
export function useFillViewport(disabled = false, minHeight = 360) {
  const ref = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (disabled) {
      el.style.height = "";
      return;
    }
    const viewport = window.visualViewport?.height ?? window.innerHeight;
    const top = el.getBoundingClientRect().top;
    const scroller = el.closest<HTMLElement>("#app-mobile-scroll");
    const bottomPad = scroller ? parseFloat(getComputedStyle(scroller).paddingBottom) || 0 : 16;
    el.style.height = `${Math.max(minHeight, Math.floor(viewport - top - bottomPad))}px`;
  }, [disabled, minHeight]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    // The page above the chat can change height (banners, fonts loading): re-measure after layout settles.
    const settle = window.setTimeout(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.clearTimeout(settle);
    };
  }, [measure]);

  return ref;
}
