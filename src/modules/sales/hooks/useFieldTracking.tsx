"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { acquireLocation, geolocationErrorKey, isLikelyMobileDevice } from "@/lib/attendance-punch-media";
import { salesApi } from "@/modules/sales/api/salesApi";

const PING_INTERVAL_MS = 45_000;
const STORAGE_KEY = "sales:field-mode-active";

function fieldLocationErrorMessage(err: unknown): string {
  switch (geolocationErrorKey(err)) {
    case "gpsPermissionDenied":
      return "Location permission denied — enable it in your browser settings to keep tracking.";
    case "gpsTimeout":
      return isLikelyMobileDevice()
        ? "GPS timed out — try again near a window with clear sky view."
        : "Location timed out — allow location for this site (laptops use Wi‑Fi positioning, not GPS).";
    case "gpsUnavailable":
      return "Location unavailable — turn on system location services and try again.";
    default:
      break;
  }
  if (err instanceof Error && err.message && err.message !== "GPS_FAILED" && err.message !== "GPS_UNSUPPORTED") {
    return err.message;
  }
  return "Couldn't get a location fix";
}

function isGeoPermissionDenied(err: unknown): boolean {
  return geolocationErrorKey(err) === "gpsPermissionDenied";
}

type FieldTrackingState = {
  isTracking: boolean;
  lastPingAt: Date | null;
  lastError: string | null;
  start: () => void;
  stop: () => void;
};

const FieldTrackingContext = createContext<FieldTrackingState | null>(null);

export function FieldTrackingProvider({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  const isRep = role === "SALES_EXECUTIVE";

  const [isTracking, setIsTracking] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Avoid double ping when start() already fired sendPing on the user gesture. */
  const skipNextEffectPingRef = useRef(false);

  const sendPing = useCallback(async () => {
    try {
      const fix = await acquireLocation();
      await salesApi.recordFieldPing({
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracyMeters: fix.accuracyMeters,
        capturedAt: new Date().toISOString(),
      });
      setLastPingAt(new Date());
      setLastError(null);
    } catch (err) {
      if (isGeoPermissionDenied(err)) {
        setLastError(fieldLocationErrorMessage(err));
        setIsTracking(false);
        return;
      }
      setLastError(fieldLocationErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, isTracking ? "1" : "0");
    } catch {
      // Ignore — best-effort persistence only.
    }

    if (!isRep || !isTracking) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (skipNextEffectPingRef.current) {
      skipNextEffectPingRef.current = false;
    } else {
      void sendPing();
    }
    intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRep, isTracking, sendPing]);

  const start = useCallback(() => {
    setLastError(null);
    skipNextEffectPingRef.current = true;
    setIsTracking(true);
    // Must run while the Start tap/click is still a user gesture (Safari / mobile Chrome).
    void sendPing();
  }, [sendPing]);

  const stop = useCallback(() => setIsTracking(false), []);

  return (
    <FieldTrackingContext.Provider value={{ isTracking, lastPingAt, lastError, start, stop }}>
      {children}
    </FieldTrackingContext.Provider>
  );
}

export function useFieldTracking(): FieldTrackingState {
  const ctx = useContext(FieldTrackingContext);
  if (!ctx) {
    throw new Error("useFieldTracking must be used within a FieldTrackingProvider");
  }
  return ctx;
}
