"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { ReviewInvitationPanel } from "@/components/reviews/ReviewInvitationPanel";

export function BookingReviewInviteSection({
  visitId,
  enabled,
}: {
  visitId: string;
  enabled: boolean;
}) {
  const tWalkIn = useTranslations("manager.walkIn");
  const tBookings = useTranslations("manager.bookings");
  const tCommon = useTranslations("common");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["review-invitation", visitId],
    queryFn: () => api.getReviewInvitationByVisit(visitId),
    enabled: enabled && !!visitId,
    staleTime: 60_000,
    retry: false,
  });

  if (!enabled || !visitId) return null;

  if (isLoading) {
    return <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>;
  }

  if (isError || !data?.reviewUrl) {
    return (
      <p className="text-sm text-[var(--text-secondary)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5">
        {tBookings("reviewInviteUnavailable")}
      </p>
    );
  }

  return (
    <ReviewInvitationPanel
      reviewUrl={data.reviewUrl}
      title={tWalkIn("reviewInviteTitle")}
      subtitle={tBookings("reviewInviteListHint")}
      copyLabel={tWalkIn("reviewCopyLink")}
      copiedLabel={tWalkIn("reviewCopiedLink")}
      shareLabel={tWalkIn("reviewShareLink")}
      submittedRating={data.submittedRating ?? null}
    />
  );
}
