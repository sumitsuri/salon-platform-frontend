"use client";

import Link from "next/link";
import { CalendarClock, ExternalLink, MapPin, Phone, Star } from "lucide-react";
import { DiscoveredSalonPreview } from "@/modules/sales/api/salesApi";
import { DiscoverPlacePhoto } from "@/modules/sales/components/DiscoverPlacePhoto";
import { formatClaimBadge } from "@/modules/sales/lib/claim-status-labels";

type DiscoveredSalonListingCardProps = {
  place: DiscoveredSalonPreview;
  busy?: boolean;
  onClaim?: () => void;
  onScheduleFollowUp?: () => void;
};

function formatReviews(count?: number) {
  if (count == null) return null;
  return count.toLocaleString("en-IN");
}

const badgeToneClass = {
  brand: "bg-[var(--brand-light)] text-[var(--brand-text)]",
  muted: "bg-[var(--surface-muted)] text-[var(--ink-muted)]",
  warn: "bg-amber-100 text-amber-900",
  success: "bg-emerald-100 text-emerald-900",
} as const;

export function DiscoveredSalonListingCard({
  place,
  busy,
  onClaim,
  onScheduleFollowUp,
}: DiscoveredSalonListingCardProps) {
  const tel = place.phone?.replace(/\s/g, "");
  const mapsUrl = place.googleMapsUrl;
  const badge = formatClaimBadge(place);

  return (
    <article className="flex gap-3 border-b border-[var(--border)] py-3 last:border-b-0">
      <DiscoverPlacePhoto
        photoRef={place.photoRef}
        alt={place.businessName}
        className="h-[72px] w-[72px] shrink-0 rounded-lg sm:h-20 sm:w-20"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold leading-snug text-[var(--ink)]">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--brand-text)] hover:underline"
              >
                {place.businessName}
              </a>
            ) : (
              place.businessName
            )}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeToneClass[badge.tone]}`}
          >
            {badge.label}
          </span>
        </div>

        {(place.rating != null || place.category || place.distanceKm != null) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--ink-muted)]">
            {place.rating != null ? (
              <>
                <span className="inline-flex items-center gap-0.5 font-medium text-[var(--ink)]">
                  {place.rating.toFixed(1)}
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                </span>
                {place.reviewCount != null ? (
                  <span>({formatReviews(place.reviewCount)})</span>
                ) : null}
              </>
            ) : null}
            {place.category ? (
              <span>
                {place.rating != null ? "· " : ""}
                {place.category}
              </span>
            ) : null}
            {place.distanceKm != null ? <span>· {place.distanceKm} km</span> : null}
          </p>
        )}

        {place.address ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">{place.address}</p>
        ) : null}

        {place.hoursSummary ? (
          <p
            className={`mt-1 text-xs ${
              place.openNow === true
                ? "text-emerald-700"
                : place.openNow === false
                  ? "text-rose-600"
                  : "text-[var(--ink-muted)]"
            }`}
          >
            {place.hoursSummary}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          {place.claimable && onClaim ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-[var(--brand)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              disabled={busy}
              onClick={onClaim}
            >
              Claim lead (30 days)
            </button>
          ) : null}
          {place.claimStatus === "CLAIMED_BY_ME" && place.leadId ? (
            <>
              <Link
                href={`/platform/sales/leads/detail?id=${place.leadId}`}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--brand-ring)] bg-[var(--brand-light)]/50 px-2 py-1 text-[11px] font-medium text-[var(--brand-text)]"
              >
                Open in pipeline
              </Link>
              {onScheduleFollowUp ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium"
                  disabled={busy}
                  onClick={onScheduleFollowUp}
                >
                  <CalendarClock className="h-3 w-3" />
                  Follow-up
                </button>
              ) : null}
            </>
          ) : null}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)]"
            >
              <MapPin className="h-3 w-3" />
              Maps
            </a>
          ) : null}
          {tel ? (
            <a
              href={`tel:${tel}`}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)]"
            >
              <Phone className="h-3 w-3" />
              Call
            </a>
          ) : null}
          {place.websiteUrl ? (
            <a
              href={place.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)]"
            >
              <ExternalLink className="h-3 w-3" />
              Website
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
