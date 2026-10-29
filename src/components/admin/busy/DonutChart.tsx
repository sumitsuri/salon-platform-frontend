"use client";

import { whole } from "./busy-model";

export interface DonutSlice {
  key: string;
  label: string;
  /** What the slice is made of, shown as the count in the legend. */
  value: number;
  colour: string;
}

const R = 46;
const C = 2 * Math.PI * R;

/** Fixed-size donut with a legend; slices carry their whole-number count and share. */
export function DonutChart({
  slices,
  title,
  centre,
  unit,
}: {
  slices: DonutSlice[];
  title: string;
  /** Text in the middle, e.g. the total. */
  centre: string;
  unit: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  let offset = 0;
  return (
    <figure className="busy-viz flex items-center gap-4" aria-label={title}>
      <svg viewBox="0 0 120 120" width={128} height={128} className="shrink-0" role="img" aria-label={title}>
        <circle cx={60} cy={60} r={R} fill="none" stroke="var(--surface-muted)" strokeWidth={16} />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.key}
                cx={60}
                cy={60}
                r={R}
                fill="none"
                stroke={s.colour}
                strokeWidth={16}
                strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              />
            );
            offset += len;
            return el;
          })}
        <text x={60} y={58} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--text-primary)">{centre}</text>
        <text x={60} y={73} textAnchor="middle" fontSize={8} fill="var(--bv-muted)">{unit}</text>
      </svg>
      <figcaption className="min-w-0 space-y-1.5 text-xs">
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        {slices.map((s) => (
          <p key={s.key} className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.colour }} />
            <span className="min-w-0 truncate">{s.label}</span>
            <span className="ml-auto shrink-0 font-semibold tabular-nums text-[var(--text-primary)]">
              {whole(s.value)} · {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </p>
        ))}
      </figcaption>
    </figure>
  );
}
