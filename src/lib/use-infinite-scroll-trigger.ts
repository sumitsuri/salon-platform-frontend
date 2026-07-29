"use client";

import { useEffect, useRef } from "react";

export function useInfiniteScrollTrigger(onTrigger: () => void, disabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (disabled) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onTriggerRef.current();
      },
      { rootMargin: "240px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled]);

  return ref;
}
