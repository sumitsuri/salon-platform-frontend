"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const STROKE_INSET = 1.25;
const CORNER_R = 16;

function roundedRectPerimeter(width: number, height: number, inset: number, cornerR: number) {
  const innerW = Math.max(0, width - 2 * inset);
  const innerH = Math.max(0, height - 2 * inset);
  const r = Math.min(cornerR, innerW / 2, innerH / 2);
  return 2 * (innerW - 2 * r) + 2 * (innerH - 2 * r) + 2 * Math.PI * r;
}

/** One stroke segment (full card width) travels anti-clockwise on the outline. */
export function WalkInCtaPerimeter() {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const anchor = host.parentElement;
      if (!anchor) return;
      setBox({ w: anchor.clientWidth, h: anchor.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host.parentElement!);
    return () => ro.disconnect();
  }, []);

  if (box.w < 8 || box.h < 8) {
    return <span ref={hostRef} className="manager-walk-in-cta-perimeter-host" aria-hidden />;
  }

  const innerW = box.w - 2 * STROKE_INSET;
  const innerH = box.h - 2 * STROKE_INSET;
  const perimeter = roundedRectPerimeter(box.w, box.h, STROKE_INSET, CORNER_R);
  const dashLen = innerW;
  const dashGap = Math.max(0, perimeter - dashLen);

  return (
    <span ref={hostRef} className="manager-walk-in-cta-perimeter-host" aria-hidden>
      <svg
        className="manager-walk-in-cta-perimeter"
        viewBox={`0 0 ${box.w} ${box.h}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        <rect
          className="manager-walk-in-cta-perimeter-runner"
          x={STROKE_INSET}
          y={STROKE_INSET}
          width={innerW}
          height={innerH}
          rx={CORNER_R}
          ry={CORNER_R}
          style={
            {
              strokeDasharray: `${dashLen} ${dashGap}`,
              "--mh-perim-cycle": `${-perimeter}`,
            } as CSSProperties
          }
        />
      </svg>
    </span>
  );
}
