import {
  Crown,
  Gem,
  MessageSquareHeart,
  RefreshCw,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import type { CampaignTemplateCategoryCode } from "@/lib/api";

export type CategoryVisual = {
  icon: LucideIcon;
  tileBg: string;
  tileIcon: string;
  cardBg: string;
  cardIcon: string;
  badge: string;
};

export const CAMPAIGN_CATEGORY_VISUAL: Record<CampaignTemplateCategoryCode, CategoryVisual> = {
  WINBACK: {
    icon: RefreshCw,
    tileBg: "bg-violet-100 dark:bg-violet-950/40",
    tileIcon: "text-violet-700 dark:text-violet-300",
    cardBg: "bg-violet-50 dark:bg-violet-950/30",
    cardIcon: "text-violet-600 dark:text-violet-300",
    badge: "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900",
  },
  MEMBERSHIP: {
    icon: Gem,
    tileBg: "bg-emerald-100 dark:bg-emerald-950/40",
    tileIcon: "text-emerald-700 dark:text-emerald-300",
    cardBg: "bg-emerald-50 dark:bg-emerald-950/30",
    cardIcon: "text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900",
  },
  PREMIUM_UPSELL: {
    icon: Crown,
    tileBg: "bg-amber-100 dark:bg-amber-950/40",
    tileIcon: "text-amber-700 dark:text-amber-300",
    cardBg: "bg-amber-50 dark:bg-amber-950/30",
    cardIcon: "text-amber-600 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900",
  },
  CROSS_SELL: {
    icon: Shuffle,
    tileBg: "bg-sky-100 dark:bg-sky-950/40",
    tileIcon: "text-sky-700 dark:text-sky-300",
    cardBg: "bg-sky-50 dark:bg-sky-950/30",
    cardIcon: "text-sky-600 dark:text-sky-300",
    badge: "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900",
  },
  REVIEWS: {
    icon: MessageSquareHeart,
    tileBg: "bg-rose-100 dark:bg-rose-950/40",
    tileIcon: "text-rose-700 dark:text-rose-300",
    cardBg: "bg-rose-50 dark:bg-rose-950/30",
    cardIcon: "text-rose-600 dark:text-rose-300",
    badge: "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900",
  },
  VIP_BEHAVIOURAL: {
    icon: Crown,
    tileBg: "bg-fuchsia-100 dark:bg-fuchsia-950/40",
    tileIcon: "text-fuchsia-700 dark:text-fuchsia-300",
    cardBg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    cardIcon: "text-fuchsia-600 dark:text-fuchsia-300",
    badge: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:ring-fuchsia-900",
  },
};
