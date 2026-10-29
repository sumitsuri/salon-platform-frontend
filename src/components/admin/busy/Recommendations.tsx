"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarDays,
  CalendarX,
  Clock,
  Coffee,
  Gem,
  Info,
  MapPin,
  Sun,
  TrendingUp,
  UserMinus,
  Users,
} from "lucide-react";
import type { DemandRecommendation } from "@/lib/api";
import { cn } from "@/lib/utils";
import { daysLabel, formatInr, rangeLong } from "./busy-model";

const TYPE_ICON: Record<string, typeof Users> = {
  RUSH: Users,
  QUIET: Coffee,
  OVERSTAFFED: UserMinus,
  PREMIUM_HOURS: Gem,
  DAY_MIX: CalendarDays,
  SEASON: Sun,
  CANCELLATIONS: CalendarX,
  OFF_HOURS: Clock,
  EDGE_HOUR: Clock,
  TREND: TrendingUp,
};

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  MEDIUM: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  LOW: "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)]",
};

export function Recommendations({
  items,
  highlightId,
  onHighlight,
}: {
  items: DemandRecommendation[];
  highlightId: string | null;
  onHighlight: (rec: DemandRecommendation | null) => void;
}) {
  const t = useTranslations("admin.busyHours");
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 3);

  return (
    <div className="space-y-3" data-testid="recommendations">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("recsNone")}</p>
      ) : (
        <ol className="divide-y divide-[var(--border)] -my-3">
          {shown.map((r, i) => {
            const Icon = TYPE_ICON[r.type] ?? Info;
            const priorityLabel = r.priority === "HIGH" ? t("priorityHigh") : r.priority === "MEDIUM" ? t("priorityMedium") : t("priorityLow");
            const onMap = r.startHour >= 0;
            const active = highlightId === r.id;
            return (
              <li
                key={r.id}
                className={cn("space-y-2.5 py-3 transition", active && "rounded-xl bg-[var(--brand-light)]/50 px-3 -mx-3")}
                data-testid="recommendation"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-light)] text-[var(--brand-text)]">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", PRIORITY_STYLE[r.priority])}>
                        {r.priority === "HIGH" ? <AlertTriangle className="h-3 w-3" aria-hidden /> : <Info className="h-3 w-3" aria-hidden />}
                        {priorityLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-tertiary,var(--text-secondary))]">#{i + 1}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-[var(--text-primary)] leading-snug">{r.title}</h3>
                  </div>
                </div>

                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{t("recSee")}</dt>
                    <dd className="text-[var(--text-primary)] leading-relaxed">{r.whatWeSee}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-text)]">{t("recDo")}</dt>
                    <dd className="font-medium text-[var(--text-primary)] leading-relaxed">{r.whatToDo}</dd>
                  </div>
                  {r.impact && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        {t("recWhy")}
                        {r.impactAmount != null ? <span className="ml-1.5 rounded bg-[var(--surface-muted)] px-1.5 py-0.5 normal-case font-semibold">{t("estimate")}</span> : null}
                      </dt>
                      <dd className="text-[var(--text-secondary)] leading-relaxed">{r.impact}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex flex-wrap items-center gap-2">
                  {r.days.length > 0 && (
                    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]">
                      {daysLabel(r.days)}
                    </span>
                  )}
                  {onMap && (
                    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]">
                      {rangeLong(r.startHour, r.endHour)}
                    </span>
                  )}
                  {r.impactAmount != null && r.impactAmount > 0 && (
                    <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
                      ≈ {formatInr(r.impactAmount)}{t("perMonth")}
                    </span>
                  )}
                  {onMap && (
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onHighlight(active ? null : r);
                        if (!active) document.querySelector('[data-testid="week-map"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={cn(
                        "ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition touch-manipulation",
                        active
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                      )}
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {active ? t("hideOnMap") : t("showOnMap")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-semibold text-[var(--brand-text)] hover:underline touch-manipulation"
        >
          {expanded ? t("showFewer") : t("showAllRecs", { n: items.length })}
        </button>
      )}
    </div>
  );
}
