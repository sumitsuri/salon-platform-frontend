"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type L from "leaflet";
import { Navigation } from "lucide-react";
import { ActiveFieldRep, salesApi } from "@/modules/sales/api/salesApi";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

const ACTIVE_REPS_POLL_MS = 15_000;
const TRAIL_POLL_MS = 20_000;
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

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min ago`;
}

function repMarkerHtml(rep: ActiveFieldRep, selected: boolean): string {
  const color = colorForRep(rep.repId);
  const ring = selected ? "box-shadow:0 0 0 3px #f59e0b, 0 2px 8px rgba(0,0,0,0.4);transform:scale(1.08);" : "box-shadow:0 1px 4px rgba(0,0,0,0.35);";
  return `<div style="
      background:${color};color:#fff;width:32px;height:32px;border-radius:9999px;
      display:flex;align-items:center;justify-content:center;font:600 11px sans-serif;
      border:2px solid white;${ring}
    ">${initials(rep.repName)}</div>`;
}

export default function SalesLiveMapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailLineRef = useRef<L.Polyline | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { data: activeReps = [], isLoading } = useQuery({
    queryKey: ["sales-field-tracking-active"],
    queryFn: () => salesApi.listActiveFieldReps(),
    refetchInterval: ACTIVE_REPS_POLL_MS,
  });

  const selectedRep = useMemo(
    () => activeReps.find((r) => r.repId === selectedRepId) ?? null,
    [activeReps, selectedRepId]
  );

  const { data: trail = [], isFetched: trailFetched } = useQuery({
    queryKey: ["sales-field-tracking-trail", selectedRepId],
    queryFn: () => salesApi.getFieldTrail(selectedRepId as string),
    enabled: !!selectedRepId,
    refetchInterval: selectedRepId ? TRAIL_POLL_MS : false,
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

      activeReps.forEach((rep: ActiveFieldRep) => {
        seen.add(rep.repId);
        const selected = selectedRepId === rep.repId;
        const icon = leaflet.divIcon({
          className: "",
          html: repMarkerHtml(rep, selected),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const existing = markersRef.current.get(rep.repId);
        if (existing) {
          existing.setLatLng([rep.latitude, rep.longitude]);
          existing.setIcon(icon);
          existing.setZIndexOffset(selected ? 1000 : 0);
        } else {
          const marker = leaflet
            .marker([rep.latitude, rep.longitude], { icon, zIndexOffset: selected ? 1000 : 0 })
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
  }, [activeReps, mapReady, selectedRepId]);

  useLayoutEffect(() => {
    trailLineRef.current?.remove();
    trailLineRef.current = null;
  }, [selectedRepId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedRep || !trailFetched) return;
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

      const boundsPoints: [number, number][] = [[selectedRep.latitude, selectedRep.longitude]];
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
      <PageHeader title="Live map" subtitle="Reps currently in field mode, updating every 15s" />

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <div ref={mapContainerRef} className="h-[60vh] w-full lg:h-[70vh]" />
        </Card>

        <Card className="max-h-[70vh] overflow-y-auto p-3">
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Active now · {activeReps.length}
          </h3>
          {!isLoading && activeReps.length === 0 && (
            <EmptyState
              title="No one's in field mode"
              description="Reps show up here once they turn on field mode from My Pipeline."
            />
          )}
          <div className="space-y-1.5">
            {activeReps.map((rep) => (
              <button
                key={rep.repId}
                type="button"
                onClick={() => setSelectedRepId(rep.repId)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition",
                  selectedRepId === rep.repId
                    ? "border-[var(--brand)] bg-[var(--brand-light)]/40"
                    : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                )}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: colorForRep(rep.repId) }}
                >
                  {initials(rep.repName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{rep.repName}</p>
                  <p className="flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                    <Navigation className="h-3 w-3" aria-hidden />
                    {formatAgo(rep.secondsSinceLastPing)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedRep && (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--ink-muted)]">
              Showing {selectedRep.repName}&rsquo;s trail for today ({trail.length} point{trail.length === 1 ? "" : "s"})
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
