"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadStage } from "@/modules/sales/api/salesApi";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  isTerminalStage,
} from "@/modules/sales/lib/stage-utils";

export function PipelineStepper({ current }: { current: LeadStage }) {
  const currentIdx = PIPELINE_STAGES.indexOf(current);

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[720px] items-center gap-0">
        {PIPELINE_STAGES.map((stage, idx) => {
          const done = currentIdx >= 0 && idx < currentIdx;
          const active = idx === currentIdx;
          const upcoming = currentIdx >= 0 && idx > currentIdx;
          const isWon = stage === "WON";
          const isLost = stage === "LOST";

          return (
            <li key={stage} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 px-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition",
                    done && !isLost && "border-emerald-500 bg-emerald-500 text-white",
                    active && isWon && "border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-100",
                    active && isLost && "border-red-600 bg-red-600 text-white ring-4 ring-red-100",
                    active && !isTerminalStage(stage) &&
                      "border-violet-600 bg-violet-600 text-white ring-4 ring-violet-100",
                    upcoming && "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-muted)]",
                    done && isLost && "border-red-400 bg-red-400 text-white"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "max-w-[72px] text-center text-[10px] font-medium leading-tight",
                    active && isWon && "text-emerald-700",
                    active && isLost && "text-red-700",
                    active && !isTerminalStage(stage) && "text-violet-700",
                    done && !isLost && "text-emerald-700",
                    upcoming && "text-[var(--ink-muted)]"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "mb-5 h-0.5 flex-1",
                    idx < currentIdx ? "bg-emerald-400" : "bg-[var(--border)]"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
