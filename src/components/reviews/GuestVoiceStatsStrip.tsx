"use client";

import { AlertTriangle, MessageSquareHeart, Star } from "lucide-react";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";

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
  return (
    <CompactStatsStrip
      testId="guest-voice-stats-strip"
      items={[
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
      ]}
    />
  );
}
