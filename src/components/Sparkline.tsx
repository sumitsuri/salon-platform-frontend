"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  values,
  color = "#4f46e5",
  width = 100,
  height = 28,
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e2e8f0" strokeWidth={1} />
      </svg>
    );
  }

  const max = Math.max(...values, 0.001);
  const coords = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = height - 4 - (v / max) * (height - 8);
    return { x, y };
  });

  const linePoints = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  return (
    <svg width={width} height={height} className={className}>
      <polygon points={areaPoints} fill={color} fillOpacity={0.08} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={values.length <= 7 ? 2.5 : 0} fill={color} />
      ))}
    </svg>
  );
}

interface ChangeBadgeProps {
  pct: number | null | undefined;
  className?: string;
}

export function ChangeBadge({ pct, className }: ChangeBadgeProps) {
  if (pct == null) {
    return <span className={cn("text-xs text-slate-400", className)}>—</span>;
  }
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "text-xs font-semibold px-1.5 py-0.5 rounded",
        up ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50",
        className
      )}
    >
      {up ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
