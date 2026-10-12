"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { useTeamRequests } from "@/components/admin/requests/use-team-requests";

/** Surfaces leave and advance requests waiting for the owner, wherever staff matters are being looked at. */
export function PendingRequestsBanner() {
  const t = useTranslations("admin.requests");
  const { pendingTotal, pendingAdvances, pendingLeaves } = useTeamRequests();
  if (pendingTotal === 0) return null;
  return (
    <Link
      href="/admin/requests"
      className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm touch-manipulation hover:bg-amber-100/70 dark:border-amber-900/50 dark:bg-amber-950/30"
      data-testid="pending-requests-banner"
    >
      <ClipboardCheck className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-amber-900 dark:text-amber-200">{t("bannerTitle", { count: pendingTotal })}</span>
        <span className="ml-2 text-xs text-amber-800/80 dark:text-amber-300/80">
          {t("bannerDetail", { leaves: pendingLeaves.length, advances: pendingAdvances.length })}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
        {t("review")}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}
