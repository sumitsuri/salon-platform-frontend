"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type L from "leaflet";
import { MapPin, Navigation } from "lucide-react";
import { ActiveFieldRep, salesApi } from "@/modules/sales/api/salesApi";
import {
  FIELD_REP_LOCATIONS_POLL_MS,
  FIELD_TRAIL_POLL_MS,
} from "@/modules/sales/lib/field-tracking-constants";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];
const MARKER_COLORS = ["#7c3aed", "#0891b2", "#d97706", "#dc2626", "#16a34a", "#2563eb", "#db2777", "#0d9488"];

function colorForRep(repId: string): string {
  let hash = 0;
  for (let i = 0; i < repId.length; i++) hash = (hash * 31 + repId.charCodeAt(i)) >>> 0;
  return MARKER_COLORS[hash % MARKER_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatAgo(seconds: number | undefined): string {
  if (seconds == null) return "No location yet";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

function repMarkerHtml(rep: ActiveFieldRep, selected: boolean): string {
  const color = colorForRep(rep.repId);
  const inactive = !rep.active;
  const opacity = inactive ? "0.55" : "1";
  const ring = selected
    ? "box-shadow:0 0 0 3px #f59e0b, 0 2px 8px rgba(0,0,0,0.4);transform:scale(1.08);"
    : inactive
      ? "box-shadow:0 1px 3px rgba(0,0,0,0.25);border-style:dashed;"
      : "box-shadow:0 1px 4px rgba(0,0,0,0.35);";
  return `<div style="
      background:${color};color:#fff;width:32px;height:32px;border-radius:9999px;
      display:flex;align-items:center;justify-content:center;font:600 11px sans-serif;
      border:2px solid white;opacity:${opacity};${ring}
    ">${initials(rep.repName)}</div>`;
}

export default function SalesLiveMapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailLineRef = useRef<L.Polyline | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { data: fieldReps = [], isLoading } = useQuery({
    queryKey: ["sales-field-tracking-active"],
    queryFn: () => salesApi.listActiveFieldReps(),
    refetchInterval: FIELD_REP_LOCATIONS_POLL_MS,
  });

  const repsWithLocation = useMemo(
    () => fieldReps.filter((r) => r.hasLocation && r.latitude != null && r.longitude != null),
    [fieldReps]
  );

  const activeCount = useMemo(() => fieldReps.filter((r) => r.active).length, [fieldReps]);

  const sortedReps = useMemo(() => {
    return [...fieldReps].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const aSec = a.secondsSinceLastPing ?? Number.MAX_SAFE_INTEGER;
      const bSec = b.secondsSinceLastPing ?? Number.MAX_SAFE_INTEGER;
      return aSec - bSec;
    });
  }, [fieldReps]);

  const selectedRep = useMemo(
    () => fieldReps.find((r) => r.repId === selectedRepId) ?? null,
    [fieldReps, selectedRepId]
  );

  const { data: trail = [], isFetched: trailFetched } = useQuery({
    queryKey: ["sales-field-tracking-trail", selectedRepId],
    queryFn: () => salesApi.getFieldTrail(selectedRepId as string),
    enabled: !!selectedRepId,
    refetchInterval: selectedRepId ? FIELD_TRAIL_POLL_MS : false,
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;
      const map = leaflet.map(mapContainerRef.current).setView(BANGALORE_CENTER, 11);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
        .addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    import("leaflet").then((leaflet) => {
      const map = mapRef.current;
      if (!map) return;
      const seen = new Set<string>();

      repsWithLocation.forEach((rep: ActiveFieldRep) => {
        seen.add(rep.repId);
        const selected = selectedRepId === rep.repId;
        const icon = leaflet.divIcon({
          className: "",
          html: repMarkerHtml(rep, selected),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const lat = rep.latitude!;
        const lng = rep.longitude!;

        const existing = markersRef.current.get(rep.repId);
        if (existing) {
          existing.setLatLng([lat, lng]);
          existing.setIcon(icon);
          existing.setZIndexOffset(selected ? 1000 : rep.active ? 100 : 0);
        } else {
          const marker = leaflet
            .marker([lat, lng], { icon, zIndexOffset: selected ? 1000 : rep.active ? 100 : 0 })
            .addTo(map)
            .on("click", () => setSelectedRepId(rep.repId));
          markersRef.current.set(rep.repId, marker);
        }
      });

      markersRef.current.forEach((marker, repId) => {
        if (!seen.has(repId)) {
          marker.remove();
          markersRef.current.delete(repId);
        }
      });
    });
  }, [repsWithLocation, mapReady, selectedRepId]);

  useLayoutEffect(() => {
    trailLineRef.current?.remove();
    trailLineRef.current = null;
  }, [selectedRepId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedRep?.hasLocation || !trailFetched) return;
    const lat = selectedRep.latitude;
    const lng = selectedRep.longitude;
    if (lat == null || lng == null) return;

    import("leaflet").then((leaflet) => {
      const map = mapRef.current;
      if (!map) return;
      trailLineRef.current?.remove();
      trailLineRef.current = null;

      if (trail.length >= 2) {
        const points: [number, number][] = trail.map((p) => [p.latitude, p.longitude]);
        trailLineRef.current = leaflet
          .polyline(points, { color: colorForRep(selectedRep.repId), weight: 3, opacity: 0.7 })
          .addTo(map);
      }

      const boundsPoints: [number, number][] = [[lat, lng]];
      for (const p of trail) boundsPoints.push([p.latitude, p.longitude]);

      if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], Math.max(map.getZoom(), 14));
        return;
      }
      map.fitBounds(leaflet.latLngBounds(boundsPoints), { padding: [48, 48], maxZoom: 16 });
    });
  }, [trail, selectedRep, trailFetched, mapReady]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Live map"
        subtitle={`All sales reps · last known location · ${activeCount} active in field mode · refreshes every 5 min`}
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <div ref={mapContainerRef} className="h-[60vh] w-full lg:h-[70vh]" />
        </Card>

        <Card className="max-h-[70vh] overflow-y-auto p-3">
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Sales team · {fieldReps.length}
            {activeCount > 0 ? (
              <span className="ml-1.5 font-normal text-emerald-700 dark:text-emerald-400">({activeCount} active)</span>
            ) : null}
          </h3>
          {!isLoading && fieldReps.length === 0 && (
            <EmptyState title="No sales reps" description="Add sales executives from the Team page." />
          )}
          <div className="space-y-1.5">
            {sortedReps.map((rep) => (
              <button
                key={rep.repId}
                type="button"
                onClick={() => setSelectedRepId(rep.repId)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition",
                  selectedRepId === rep.repId
                    ? "border-[var(--brand)] bg-[var(--brand-light)]/40"
                    : "border-[var(--border)] hover:bg-[var(--surface-muted)]",
                  !rep.hasLocation && "opacity-80"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                    !rep.active && "opacity-60"
                  )}
                  style={{ backgroundColor: colorForRep(rep.repId) }}
                >
                  {initials(rep.repName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{rep.repName}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        rep.active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-[var(--surface-muted)] text-[var(--ink-muted)]"
                      )}
                    >
                      {rep.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                    {rep.hasLocation ? (
                      <>
                        <Navigation className="h-3 w-3 shrink-0" aria-hidden />
                        Last seen {formatAgo(rep.secondsSinceLastPing)}
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        No location shared yet
                      </>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedRep && (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--ink-muted)]">
              {selectedRep.hasLocation ? (
                <>
                  Showing {selectedRep.repName}&rsquo;s trail for today ({trail.length} point
                  {trail.length === 1 ? "" : "s"})
                  {!selectedRep.active ? " · last known position (not in field mode now)" : null}
                </>
              ) : (
                <>Select a rep with a shared location to see them on the map.</>
              )}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
