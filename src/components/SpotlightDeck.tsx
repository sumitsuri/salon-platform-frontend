"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpotlightTone = "urgent" | "growth" | "insight" | "celebrate";

export type SpotlightItem = {
  id: string;
  title: string;
  description: string;
  tone: SpotlightTone;
  metricLabel?: string;
  metricValue?: string;
  groupId?: string;
  dayKey?: string;
};

const ROTATE_MS = 5000;

export function SpotlightSection({
  title,
  icon: Icon,
  iconVariant = "action",
  count,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  iconVariant?: "action" | "metrics" | "weekday";
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-action-rail dashboard-action-rail--deck", className)}>
      <div
        className={cn(
          "dashboard-overview-section-head",
          iconVariant === "metrics" && "dashboard-overview-section-head--metrics",
          iconVariant === "action" && "dashboard-overview-section-head--action",
          iconVariant === "weekday" && "dashboard-overview-section-head--weekday"
        )}
      >
        <span
          className={cn(
            "dashboard-overview-section-icon",
            iconVariant === "metrics" && "dashboard-overview-section-icon--metrics",
            iconVariant === "action" &&
              "dashboard-overview-section-icon--action dashboard-action-deck-icon dashboard-action-deck-icon--pulse",
            iconVariant === "weekday" && "dashboard-overview-section-icon--weekday"
          )}
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="dashboard-overview-section-title">{title}</h2>
        </div>
        {count != null && count > 0 ? (
          <span className="dashboard-action-deck-count shrink-0">{count}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SpotlightDeck({
  items,
  loading,
  revealHint = "Tap to reveal",
  headerExtra,
  renderHeaderExtra,
  onActiveItemChange,
  className,
}: {
  items: SpotlightItem[];
  loading?: boolean;
  revealHint?: string;
  headerExtra?: ReactNode;
  renderHeaderExtra?: (activeItem: SpotlightItem) => ReactNode;
  onActiveItemChange?: (item: SpotlightItem, index: number) => void;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setExpanded(false);
  }, [items.map((item) => item.id).join("|")]);

  useEffect(() => {
    if (loading || expanded || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [loading, expanded, items.length]);

  const safeIndex = items.length > 0 ? activeIndex % items.length : 0;
  const active = items[safeIndex];
  const activeHeaderExtra = active
    ? (renderHeaderExtra?.(active) ?? headerExtra)
    : (headerExtra ?? null);

  useEffect(() => {
    if (!active || loading) return;
    onActiveItemChange?.(active, safeIndex);
  }, [active, safeIndex, loading, onActiveItemChange]);

  if (loading) {
    return (
      <div className={cn("dashboard-action-deck px-3 pb-3 pt-2", className)}>
        <div className="dashboard-action-spot dashboard-action-spot--skeleton h-11 animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={cn("dashboard-action-deck px-3 pb-3 pt-2", className)}>
      {activeHeaderExtra ? (
        <div className="dashboard-spotlight-extra mb-2">{activeHeaderExtra}</div>
      ) : null}
      <div
        className={cn(
          "dashboard-action-spot-wrap",
          `dashboard-action-spot-wrap--${active.tone}`,
          expanded && "dashboard-action-spot-wrap--expanded"
        )}
      >
        <button
          type="button"
          className={cn(
            "dashboard-action-spot group touch-manipulation",
            `dashboard-action-spot--${active.tone}`,
            expanded && "dashboard-action-spot--expanded"
          )}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span
            className={cn("dashboard-action-spot-signal", `dashboard-action-spot-signal--${active.tone}`)}
            aria-hidden
          />
          <span className="dashboard-action-spot-body min-w-0 flex-1 text-left">
            <span className="dashboard-action-spot-row flex items-start justify-between gap-2">
              <span
                key={active.id}
                className="dashboard-action-spot-title dashboard-action-spot-title--enter min-w-0"
              >
                {active.title}
              </span>
              {active.metricValue ? (
                <span className="dashboard-action-spot-metric shrink-0">
                  {active.metricLabel ? (
                    <span className="dashboard-action-spot-metric-label">{active.metricLabel}</span>
                  ) : null}
                  <span className="dashboard-action-spot-metric-value">{active.metricValue}</span>
                </span>
              ) : null}
            </span>
            <span className={cn("dashboard-action-spot-reveal", expanded && "dashboard-action-spot-reveal--open")}>
              <span key={`${active.id}-desc`} className="dashboard-action-spot-desc dashboard-action-spot-desc--enter">
                {active.description}
              </span>
            </span>
            {!expanded ? <span className="dashboard-action-spot-hint">{revealHint}</span> : null}
          </span>
          <ChevronDown
            className={cn(
              "dashboard-action-spot-chevron h-4 w-4 shrink-0 transition-transform duration-300",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        {!expanded && items.length > 1 ? (
          <div
            key={active.id}
            className="dashboard-action-spot-progress"
            style={{ animationDuration: `${ROTATE_MS}ms` }}
            aria-hidden
          />
        ) : null}
      </div>

      {items.length > 1 ? (
        <div className="dashboard-action-deck-dots" role="tablist" aria-label="Highlights">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === safeIndex}
              aria-label={item.title}
              className={cn(
                "dashboard-action-deck-dot touch-manipulation",
                index === safeIndex && "dashboard-action-deck-dot--active",
                `dashboard-action-deck-dot--${item.tone}`
              )}
              onClick={() => {
                setActiveIndex(index);
                setExpanded(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
