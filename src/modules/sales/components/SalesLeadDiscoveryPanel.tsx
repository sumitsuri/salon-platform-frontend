"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import {
  DiscoverSalonsResponse,
  DiscoveredSalonPreview,
  SalesLocality,
  SalesRep,
  salesApi,
} from "@/modules/sales/api/salesApi";
import { DiscoveredSalonListingCard } from "@/modules/sales/components/DiscoveredSalonListingCard";
import { ClaimQuoteSheet, type ClaimedLeadSummary } from "@/modules/sales/components/ClaimQuoteSheet";
import { invalidateSalesLeadLists } from "@/modules/sales/lib/query-keys";
import { AlertBanner, btnPrimary, btnSecondary, Card, inputClass, selectClass } from "@/components/ui";
const RADIUS_KM_OPTIONS = [1, 2, 3, 5, 7, 10, 15];
const LISTINGS_PAGE_SIZE = 5;

type SalesLeadDiscoveryPanelProps = {
  localities: SalesLocality[];
  isAdmin: boolean;
  reps?: SalesRep[];
  onImported?: () => void;
};

/** Show/hide is owned by the parent's discovery CTA — mount this only when expanded. */
export function SalesLeadDiscoveryPanel({
  localities,
  isAdmin,
  reps = [],
  onImported,
}: SalesLeadDiscoveryPanelProps) {
  const mappable = useMemo(
    () => localities.filter((l) => l.mappable !== false && l.latitude != null),
    [localities]
  );

  const [localityId, setLocalityId] = useState("");
  const [radiusKm, setRadiusKm] = useState(3);
  const [assignRepId, setAssignRepId] = useState("");
  const [preview, setPreview] = useState<DiscoverSalonsResponse | null>(null);
  const [listPage, setListPage] = useState(0);
  const [error, setError] = useState("");
  const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
  const [followUpAt, setFollowUpAt] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [claimedLead, setClaimedLead] = useState<ClaimedLeadSummary | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!localityId && mappable.length > 0) {
      setLocalityId(mappable[0].id);
    }
  }, [localityId, mappable]);

  const previewMutation = useMutation({
    mutationFn: () =>
      salesApi.previewDiscoverSalons({
        localityId,
        radiusKm,
        assignRepId: isAdmin && assignRepId ? assignRepId : undefined,
      }),
    onSuccess: (data) => {
      setPreview(data);
      setListPage(0);
      setError("");
      if (data.activeSyncJobId) {
        setSyncJobId(data.activeSyncJobId);
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  useEffect(() => {
    if (localityId) {
      previewMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload CRM list when filters change
  }, [localityId, radiusKm]);

  const { data: syncJob } = useQuery({
    queryKey: ["sales-map-sync", syncJobId ?? "active"],
    queryFn: async () => {
      if (syncJobId) {
        return salesApi.getMapSyncJob(syncJobId);
      }
      return (await salesApi.getActiveMapSync()) ?? null;
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? 2500 : false;
    },
  });

  useEffect(() => {
    if (syncJob?.id && syncJobId !== syncJob.id) {
      setSyncJobId(syncJob.id);
    }
  }, [syncJob?.id, syncJobId]);

  useEffect(() => {
    if (syncJob?.status === "COMPLETED") {
      previewMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncJob?.status, syncJob?.finishedAt]);

  const importMutation = useMutation({
    mutationFn: () =>
      salesApi.importDiscoverSalons({
        localityId,
        radiusKm,
        assignRepId: isAdmin && assignRepId ? assignRepId : undefined,
      }),
    onSuccess: (data) => {
      setPreview(data);
      setListPage(0);
      setError("");
      onImported?.();
    },
    onError: (e: Error) => setError(e.message),
  });

  const claimMutation = useMutation({
    mutationFn: (place: DiscoveredSalonPreview) =>
      salesApi.claimDiscoverSalon({
        googlePlaceId: place.googlePlaceId,
        localityId,
        radiusKm,
        businessName: place.businessName,
        address: place.address,
        phone: place.phone,
        googleMapsUrl: place.googleMapsUrl,
      }),
    onSuccess: async (lead) => {
      setError("");
      await invalidateSalesLeadLists(queryClient);
      onImported?.();
      previewMutation.mutate();
      setClaimedLead({ id: lead.id, businessName: lead.businessName, expectedBranches: lead.expectedBranches });
    },
    onError: (e: Error) => setError(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: (body: { allAreas: boolean }) =>
      salesApi.startMapSync({
        allAreas: body.allAreas,
        localityId: body.allAreas ? undefined : localityId,
        radiusKm: body.allAreas ? 5 : radiusKm,
      }),
    onSuccess: (job) => {
      setSyncJobId(job.id);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const followUpMutation = useMutation({
    mutationFn: () =>
      salesApi.scheduleFollowUp(followUpLeadId!, {
        followUpAt: new Date(followUpAt).toISOString(),
        notes: followUpNotes || undefined,
      }),
    onSuccess: () => {
      setFollowUpLeadId(null);
      setFollowUpAt("");
      setFollowUpNotes("");
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const syncRunning = syncJob?.status === "QUEUED" || syncJob?.status === "RUNNING";

  const busy =
    previewMutation.isPending ||
    importMutation.isPending ||
    claimMutation.isPending ||
    followUpMutation.isPending ||
    syncMutation.isPending ||
    syncRunning;
  const areaLabel = mappable.find((l) => l.id === localityId)?.name ?? "area";

  const totalPlaces = preview?.previews.length ?? 0;
  const pageCount = totalPlaces > 0 ? Math.ceil(totalPlaces / LISTINGS_PAGE_SIZE) : 0;
  const pageStart = listPage * LISTINGS_PAGE_SIZE;
  const pageItems = preview?.previews.slice(pageStart, pageStart + LISTINGS_PAGE_SIZE) ?? [];
  const claimableCount =
    preview?.previews.filter((p) => p.claimable).length ?? 0;

  if (mappable.length === 0) {
    return null;
  }

  return (
    <Card className="border-[var(--brand-ring)]/60 bg-gradient-to-br from-[var(--brand-light)]/30 to-[var(--surface)] p-4">
      <div className="space-y-3">
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

          {syncJob && (syncRunning || syncJob.status === "FAILED") ? (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                syncJob.status === "FAILED"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-muted)]"
              }`}
            >
              {syncJob.status === "FAILED" ? (
                <p>Map sync failed: {syncJob.errorMessage ?? "Unknown error"}</p>
              ) : (
                <>
                  <p className="font-medium text-[var(--ink)]">
                    Syncing from Google… {syncJob.progressPercent}%
                  </p>
                  <p className="mt-1">
                    {syncJob.currentAreaName
                      ? `Area: ${syncJob.currentAreaName} (${syncJob.completedAreas}/${syncJob.totalAreas})`
                      : `Preparing ${syncJob.totalAreas} areas`}
                    {" · "}
                    +{syncJob.leadsInserted} new · {syncJob.leadsSkippedDuplicate} updated/skipped
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full bg-[var(--brand)] transition-all duration-500"
                      style={{ width: `${syncJob.progressPercent}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-[var(--ink-muted)]">
              Area
              <select
                className={`${selectClass} mt-1 w-full`}
                value={localityId}
                onChange={(e) => setLocalityId(e.target.value)}
                disabled={busy}
              >
                {mappable.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.zone ? ` (${loc.zone})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[var(--ink-muted)]">
              Radius (km)
              <select
                className={`${selectClass} mt-1 w-full`}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                disabled={busy}
              >
                {RADIUS_KM_OPTIONS.map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </label>

            {isAdmin ? (
              <label className="block text-xs font-medium text-[var(--ink-muted)] sm:col-span-2">
                Assign imports to
                <select
                  className={`${selectClass} mt-1 w-full`}
                  value={assignRepId}
                  onChange={(e) => setAssignRepId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Me / current user</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={busy || !localityId}
              onClick={() => previewMutation.mutate()}
            >
              <MapPin className="mr-1.5 inline h-4 w-4" />
              {previewMutation.isPending ? "Loading…" : "Show saved leads"}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy || !localityId}
              onClick={() => syncMutation.mutate({ allAreas: false })}
            >
              <RefreshCw className={`mr-1.5 inline h-4 w-4 ${syncRunning ? "animate-spin" : ""}`} />
              Refresh this area
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy}
              onClick={() => syncMutation.mutate({ allAreas: true })}
            >
              <RefreshCw className={`mr-1.5 inline h-4 w-4 ${syncRunning ? "animate-spin" : ""}`} />
              Sync all areas
            </button>
            {isAdmin ? (
              <button
                type="button"
                className={btnPrimary}
                disabled={busy || !localityId || !preview}
                onClick={() => importMutation.mutate()}
              >
                {importMutation.isPending ? "Importing…" : "Bulk import (admin)"}
              </button>
            ) : null}
          </div>

          {preview ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/80 px-3 py-2.5 sm:px-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Places near {preview.areaName}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {preview.placesFound} saved lead{preview.placesFound === 1 ? "" : "s"} within {preview.radiusKm}{" "}
                  km · {claimableCount} available to claim
                  {preview.lastSyncedAt
                    ? ` · last Google sync ${new Date(preview.lastSyncedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>

              {pageItems.length > 0 ? (
                <div className="divide-y divide-[var(--border)] px-3 sm:px-4">
                  {pageItems.map((p) => (
                    <DiscoveredSalonListingCard
                      key={p.googlePlaceId}
                      place={p}
                      busy={busy}
                      onClaim={p.claimable ? () => claimMutation.mutate(p) : undefined}
                      onScheduleFollowUp={
                        p.leadId && p.claimStatus === "CLAIMED_BY_ME"
                          ? () => {
                              setFollowUpLeadId(p.leadId!);
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              d.setHours(10, 0, 0, 0);
                              setFollowUpAt(d.toISOString().slice(0, 16));
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-[var(--ink-muted)]">
                  No saved leads for this filter yet. Use <strong>Refresh this area</strong> or{" "}
                  <strong>Sync all areas</strong> to pull from Google (runs in background).
                </p>
              )}

              {pageCount > 1 ? (
                <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <p className="text-center text-xs text-[var(--ink-muted)] sm:text-left">
                    Showing {pageStart + 1}–{Math.min(pageStart + LISTINGS_PAGE_SIZE, totalPlaces)} of {totalPlaces}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium disabled:opacity-40"
                      disabled={listPage <= 0}
                      onClick={() => setListPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--brand-ring)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--brand-light)]/40 disabled:opacity-40 sm:flex-none sm:min-w-[140px]"
                      disabled={listPage >= pageCount - 1}
                      onClick={() => setListPage((p) => Math.min(pageCount - 1, p + 1))}
                    >
                      More places
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">
              Tip: choose {areaLabel} and radius — list loads from CRM instantly. Use refresh when you need newer
              Google results.
            </p>
          )}

          {followUpLeadId ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="text-sm font-semibold">Schedule follow-up</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block flex-1 text-xs text-[var(--ink-muted)]">
                  When
                  <input
                    type="datetime-local"
                    className={`${inputClass} mt-1 w-full`}
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                </label>
                <input
                  className={`${inputClass} flex-[2]`}
                  placeholder="Notes (optional)"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={!followUpAt || followUpMutation.isPending}
                  onClick={() => followUpMutation.mutate()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setFollowUpLeadId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
      </div>

      <ClaimQuoteSheet lead={claimedLead} onClose={() => setClaimedLead(null)} />
    </Card>
  );
}
