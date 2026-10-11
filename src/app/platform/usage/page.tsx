"use client";

import { MissionStrip } from "@/components/brand/MissionStrip";
import { PlatformUsagePortfolioView } from "@/modules/platform/usage/PlatformUsagePortfolioView";

export default function PlatformUsagePage() {
  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <MissionStrip />
      <PlatformUsagePortfolioView />
    </div>
  );
}
