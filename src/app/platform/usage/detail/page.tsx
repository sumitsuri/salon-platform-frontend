"use client";

import { useSearchParams } from "next/navigation";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { AlertBanner } from "@/components/ui";
import { PlatformUsageTenantView } from "@/modules/platform/usage/PlatformUsageTenantView";

export default function PlatformTenantUsagePage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <MissionStrip />
      {!tenantId ? (
        <AlertBanner variant="error">Missing brand. Open usage from the brand list.</AlertBanner>
      ) : (
        <PlatformUsageTenantView tenantId={tenantId} />
      )}
    </div>
  );
}
