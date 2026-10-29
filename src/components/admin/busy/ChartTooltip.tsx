"use client";

import { useCallback, useRef, useState } from "react";

export interface TipState<T> {
  x: number;
  y: number;
  /** Width of the chart wrapper when the tip was shown, so it can be kept inside the card. */
  width: number;
  data: T;
}

/**
 * One floating tooltip for a chart. Marks call `show` on pointer-move and keyboard focus (the same readout both
 * ways), `hide` on leave/blur. Position is relative to the wrapper so it never escapes the card.
 */
export function useChartTooltip<T>() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState<T> | null>(null);

  const showAt = useCallback((clientX: number, clientY: number, data: T) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: clientX - box.left, y: clientY - box.top, width: box.width, data });
  }, []);

  const onPointer = useCallback((e: React.PointerEvent, data: T) => showAt(e.clientX, e.clientY, data), [showAt]);

  const onFocus = useCallback(
    (e: React.FocusEvent<Element>, data: T) => {
      const r = e.currentTarget.getBoundingClientRect();
      showAt(r.left + r.width / 2, r.top, data);
    },
    [showAt]
  );

  const hide = useCallback(() => setTip(null), []);
  return { wrapRef, tip, onPointer, onFocus, hide };
}

export function TooltipLayer({ tip, children }: { tip: TipState<unknown> | null; children: React.ReactNode }) {
  if (!tip) return null;
  const boxW = 230;
  const left = Math.max(4, Math.min(tip.width - boxW - 4, tip.x - boxW / 2));
  const flip = tip.y < 120;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg"
      style={{ left, top: flip ? tip.y + 16 : tip.y - 10, width: boxW, transform: flip ? undefined : "translateY(-100%)" }}
    >
      {children}
    </div>
  );
}
