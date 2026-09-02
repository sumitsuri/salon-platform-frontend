"use client";

import { type RefObject, useEffect, useRef } from "react";

export function useInfiniteScrollTrigger(
  onTrigger: () => void,
  disabled: boolean,
  scrollRootRef?: RefObject<Element | null>
) {
  const ref = useRef<HTMLDivElement>(null);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (disabled) return;
    const element = ref.current;
    if (!element) return;

    const root = scrollRootRef?.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onTriggerRef.current();
      },
      { root, rootMargin: root ? "120px" : "240px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, scrollRootRef]);

  return ref;
}
