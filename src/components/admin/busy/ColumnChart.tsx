"use client";

import { cn } from "@/lib/utils";
import { TooltipLayer, useChartTooltip } from "./ChartTooltip";
import { niceScale, whole } from "./busy-model";

export interface ColumnItem {
  key: string;
  label: string;
  value: number;
  /** A reference level drawn across the column, e.g. what the team can comfortably serve. */
  marker?: number | null;
  /** Staffing verdict shown as a chip under the column (▲ short · ✓ right · ▼ spare). */
  state?: "STRETCHED" | "OK" | "IDLE" | null;
  /** Drawn lighter, e.g. hours outside opening time or a month still in progress. */
  faded?: boolean;
  tip: { title: string; lines: string[] };
}

const PLOT_H = 176;

/**
 * Column chart in plain HTML: bars keep a fixed maximum width and text keeps its size however wide the card is, so
 * nothing stretches. Every bar carries its whole-number count; the same readout is on hover and keyboard focus.
 */
export function ColumnChart({
  items,
  label,
  ribbon = false,
  markerLabel,
  statusLabels,
}: {
  items: ColumnItem[];
  label: string;
  /** Show the staffing chip row under the columns. */
  ribbon?: boolean;
  /** Legend text for the marker line, when there is one. */
  markerLabel?: string;
  statusLabels?: { stretched: string; right: string; spare: string };
}) {
  const { wrapRef, tip, onPointer, onFocus, hide } = useChartTooltip<ColumnItem>();
  const top = Math.max(...items.map((i) => Math.max(i.value, i.marker ?? 0)), 0);
  const scale = niceScale(top * 1.1);
  const pct = (v: number) => `${Math.min(100, (v / scale.max) * 100)}%`;
  const peak = items.length ? items.reduce((b, i) => (i.value > b.value ? i : b), items[0]) : null;

  return (
    <div ref={wrapRef} className="relative busy-viz" onPointerLeave={hide}>
      <div className="flex gap-2" role="group" aria-label={label}>
        <div className="relative w-8 shrink-0" style={{ height: PLOT_H }} aria-hidden>
          {scale.ticks.map((v) => (
            <span
              key={v}
              className="absolute right-0 -translate-y-1/2 text-[10px] leading-none tabular-nums text-[var(--bv-muted)]"
              style={{ bottom: pct(v) }}
            >
              {v}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="min-w-full" style={{ minWidth: `${items.length * 1.3}rem` }}>
            <div className="relative" style={{ height: PLOT_H }}>
              {scale.ticks.map((v) => (
                <span key={v} className="absolute inset-x-0 border-t border-[var(--bv-grid)]" style={{ bottom: pct(v) }} aria-hidden />
              ))}
              <div className="absolute inset-0 flex">
                {items.map((it) => (
                  <div
                    key={it.key}
                    role="img"
                    tabIndex={0}
                    aria-label={`${it.tip.title}: ${it.tip.lines.join(", ")}`}
                    onPointerMove={(e) => onPointer(e, it)}
                    onFocus={(e) => onFocus(e, it)}
                    onBlur={hide}
                    className="relative flex-1 min-w-0 outline-none focus-visible:bg-[var(--surface-muted)]"
                  >
                    {it.value > 0 && (
                      <>
                        <span
                          className="absolute left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] font-semibold leading-none tracking-tighter sm:tracking-normal tabular-nums text-[var(--text-primary)]"
                          style={{ bottom: `calc(${pct(it.value)} + 4px)` }}
                        >
                          {whole(it.value)}
                        </span>
                        <span
                          className={cn("absolute left-1/2 w-[62%] max-w-7 -translate-x-1/2 rounded-t-md", it.faded && "opacity-45")}
                          style={{ bottom: 0, height: pct(it.value), background: "var(--bv-series-1)" }}
                        />
                      </>
                    )}
                    {it.marker != null && it.marker > 0 && (
                      <span
                        className="absolute left-[8%] right-[8%] h-0.5 rounded-full"
                        style={{ bottom: pct(it.marker), background: "var(--bv-series-2)" }}
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1.5 flex">
              {items.map((it) => (
                <span
                  key={it.key}
                  className={cn("flex-1 min-w-0 text-center text-[10px] leading-4 tabular-nums", it.faded ? "italic text-[var(--bv-muted)]" : "text-[var(--text-secondary)]", it === peak && "font-bold text-[var(--text-primary)]")}
                >
                  {it.label}
                </span>
              ))}
            </div>

            {ribbon && (
              <div className="mt-1.5 flex gap-[2px]">
                {items.map((it) => {
                  const bin = it.state === "STRETCHED" ? "s2" : it.state === "IDLE" ? "p2" : "0";
                  return (
                    <span
                      key={it.key}
                      className="flex h-4 sm:h-5 flex-1 min-w-0 items-center justify-center rounded text-[9px] sm:text-[10px] font-bold"
                      style={it.state ? { background: `var(--bv-div-${bin})`, color: `var(--bv-div-ink-${bin})` } : { background: "var(--surface-muted)" }}
                      aria-hidden
                    >
                      {it.state === "STRETCHED" ? "▲" : it.state === "IDLE" ? "▼" : it.state === "OK" ? "✓" : ""}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {(markerLabel || (ribbon && statusLabels)) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-10 text-[11px] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--bv-series-1)" }} />
            {label}
          </span>
          {markerLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: "var(--bv-series-2)" }} />
              {markerLabel}
            </span>
          )}
          {ribbon && statusLabels && (
            <span>
              <b>▲</b> {statusLabels.stretched} · <b>✓</b> {statusLabels.right} · <b>▼</b> {statusLabels.spare}
            </span>
          )}
        </div>
      )}

      <TooltipLayer tip={tip}>
        {tip && (
          <div className="space-y-0.5">
            <p className="font-semibold text-[var(--text-primary)]">{tip.data.tip.title}</p>
            {tip.data.tip.lines.map((l, i) => (
              <p key={l} className={i === 0 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"}>{l}</p>
            ))}
          </div>
        )}
      </TooltipLayer>
    </div>
  );
}
