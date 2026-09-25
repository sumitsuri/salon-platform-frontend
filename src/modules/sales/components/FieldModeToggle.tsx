"use client";

import { MapPin, Navigation } from "lucide-react";
import { useFieldTracking } from "@/modules/sales/hooks/useFieldTracking";
import { cn } from "@/lib/utils";
import { Card, btnPrimarySm, btnSecondary } from "@/components/ui";

function secondsAgo(date: Date): number {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
}

export function FieldModeToggle() {
  const { isTracking, lastPingAt, lastError, start, stop } = useFieldTracking();

  return (
    <Card
      className={cn(
        "flex items-center justify-between gap-3 p-3",
        isTracking ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20" : ""
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isTracking
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
              : "bg-[var(--surface-muted)] text-[var(--ink-muted)]"
          )}
        >
          {isTracking ? <Navigation className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {isTracking ? "Field mode on" : "Field mode off"}
          </p>
          <p className="truncate text-xs text-[var(--ink-muted)]">
            {lastError
              ? lastError
              : isTracking
                ? lastPingAt
                  ? `Sharing location · last ping ${secondsAgo(lastPingAt)}s ago`
                  : "Getting a location fix…"
                : "Turn on so your manager can see where you are today"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={isTracking ? stop : start}
        className={cn(isTracking ? btnSecondary : btnPrimarySm, "shrink-0")}
      >
        {isTracking ? "Stop" : "Start"}
      </button>
    </Card>
  );
}
