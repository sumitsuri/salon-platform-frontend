"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, MessageSquareHeart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StatAccent = "violet" | "sky" | "emerald" | "amber";

type GuestVoiceStat = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: StatAccent;
  onClick?: () => void;
  testId?: string;
  pulse?: boolean;
  featured?: boolean;
};

export function GuestVoiceStatsStrip({
  avgRating,
  totalReviews,
  promoters,
  needsAttention,
  labels,
  onAvgClick,
  onReviewsClick,
  onPromotersClick,
  onAttentionClick,
}: {
  avgRating: string;
  totalReviews: number;
  promoters: number;
  needsAttention: number;
  labels: {
    avgRating: string;
    totalReviews: string;
    promoters: string;
    needsAttention: string;
  };
  onAvgClick: () => void;
  onReviewsClick: () => void;
  onPromotersClick: () => void;
  onAttentionClick: () => void;
}) {
  const stats: GuestVoiceStat[] = [
    {
      id: "avg",
      label: labels.avgRating,
      value: avgRating,
      icon: Star,
      accent: "violet",
      onClick: onAvgClick,
      testId: "guest-voice-stat-avg",
      featured: avgRating !== "—",
    },
    {
      id: "reviews",
      label: labels.totalReviews,
      value: String(totalReviews),
      icon: MessageSquareHeart,
      accent: "sky",
      onClick: onReviewsClick,
      testId: "guest-voice-stat-reviews",
    },
    {
      id: "promoters",
      label: labels.promoters,
      value: String(promoters),
      icon: Star,
      accent: "emerald",
      onClick: onPromotersClick,
      testId: "guest-voice-stat-promoters",
    },
    {
      id: "attention",
      label: labels.needsAttention,
      value: String(needsAttention),
      icon: AlertTriangle,
      accent: "amber",
      onClick: onAttentionClick,
      testId: "guest-voice-stat-recoveries",
      pulse: needsAttention > 0,
    },
  ];

  return (
    <div className="guest-voice-stats-strip" data-testid="guest-voice-stats-strip">
      <div className="guest-voice-stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const Tag = stat.onClick ? "button" : "div";

          return (
            <Tag
              key={stat.id}
              type={stat.onClick ? "button" : undefined}
              onClick={stat.onClick}
              data-testid={stat.testId}
              className={cn(
                "guest-voice-stat-cell group touch-manipulation text-left",
                `guest-voice-stat-cell--${stat.accent}`,
                stat.featured && "guest-voice-stat-cell--featured",
                stat.pulse && "guest-voice-stat-cell--pulse",
                stat.onClick && "guest-voice-stat-cell--interactive"
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className={cn("guest-voice-stat-icon", `guest-voice-stat-icon--${stat.accent}`)} aria-hidden>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="guest-voice-stat-value tabular-nums">{stat.value}</span>
              <span className="guest-voice-stat-label">{stat.label}</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
