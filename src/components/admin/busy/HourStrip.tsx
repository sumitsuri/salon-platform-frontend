"use client";

import { useMemo } from "react";
import type { BranchDemand } from "@/lib/api";
import { daySeries, fmt1, hourShort, openWeekdays, rangeLong, type HourPoint } from "./busy-model";

const BAR = 12;
const GAP = 3;
const H = 34;

function colour(state: HourPoint["state"], staffKnown: boolean): string {
  if (!staffKnown || state === null) return "var(--bv-series-1)";
  if (state === "STRETCHED") return "var(--bv-div-s2)";
  if (state === "IDLE") return "var(--bv-div-p2)";
  return "var(--bv-div-0)";
}

/** Plain-words version of the strip for screen readers and the native tooltip. */
function describe(points: HourPoint[], short: string, spare: string): string {
  const range = (state: "STRETCHED" | "IDLE") => {
    const out: string[] = [];
    let start: number | null = null;
    for (let i = 0; i <= points.length; i++) {
      const hit = points[i] && points[i].state === state;
      if (hit && start === null) start = points[i].hour;
      if (!hit && start !== null) {
        out.push(rangeLong(start, points[i - 1].hour + 1));
        start = null;
      }
    }
    return out.join(", ");
  };
  const s = range("STRETCHED");
  const i = range("IDLE");
  return [s ? `${short}: ${s}` : "", i ? `${spare}: ${i}` : ""].filter(Boolean).join(". ");
}

/**
 * One typical day as a row of bars: height = customers arriving that hour, colour = whether the team on the
 * floor is short (red), about right (grey) or has people to spare (blue). Hours without attendance data stay blue.
 */
export function HourStrip({
  branch,
  days,
  labels = "none",
  height = H,
  shortLabel,
  spareLabel,
}: {
  branch: BranchDemand;
  /** ISO weekdays to average; defaults to every day the branch trades. */
  days?: number[];
  /** "ends" names only the first and last hour; "some" every third; "none" draws no hours. */
  labels?: "none" | "ends" | "some";
  height?: number;
  shortLabel: string;
  spareLabel: string;
}) {
  const open = useMemo(() => openWeekdays(branch), [branch]);
  const set = days && days.length > 0 ? days : open;
  const points = useMemo(() => daySeries(branch, set).filter((p) => p.inHours), [branch, set]);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.visits), 0.0001);
  const known = branch.staffDataAvailable;
  const width = points.length * (BAR + GAP) - GAP;
  const total = height + (labels !== "none" ? 14 : 0);
  const summary = describe(points, shortLabel, spareLabel);

  return (
    <svg
      viewBox={`0 0 ${width} ${total}`}
      width="100%"
      height={total}
      preserveAspectRatio="xMinYMid meet"
      className="busy-viz block max-w-[22rem]"
      role="img"
      aria-label={summary || undefined}
    >
      <title>{summary}</title>
      {points.map((p, i) => {
        const h = p.visits <= 0 ? 0 : Math.max(3, (p.visits / max) * (height - 2));
        const x = i * (BAR + GAP);
        return (
          <g key={p.hour}>
            <rect x={x} y={height - h} width={BAR} height={h} rx={3} fill={colour(p.state, known)}>
              <title>{`${rangeLong(p.hour, p.hour + 1)}: ${fmt1(p.visits)} customers an hour`}</title>
            </rect>
            {(labels === "some" ? i === 0 || i === points.length - 1 || i % 3 === 0 : labels === "ends" && (i === 0 || i === points.length - 1)) && (
              <text x={i === 0 ? x : x + BAR} y={height + 11} textAnchor={labels === "ends" ? (i === 0 ? "start" : "end") : "middle"} fontSize={8} fill="var(--bv-muted)">
                {hourShort(p.hour)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
