"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { salesApi } from "@/modules/sales/api/salesApi";

const PING_INTERVAL_MS = 45_000;
const STORAGE_KEY = "sales:field-mode-active";

type FieldTrackingState = {
  isTracking: boolean;
  lastPingAt: Date | null;
  lastError: string | null;
  start: () => void;
  stop: () => void;
};

const FieldTrackingContext = createContext<FieldTrackingState | null>(null);

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 10_000,
    });
  });
}

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

  const sendPing = useCallback(async () => {
    try {
      const position = await getPosition();
      await salesApi.recordFieldPing({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy ?? undefined,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
      setLastPingAt(new Date());
      setLastError(null);
    } catch (err) {
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        setLastError("Location permission denied — enable it in your browser settings to keep tracking.");
        setIsTracking(false);
        return;
      }
      setLastError(err instanceof Error ? err.message : "Couldn't get a location fix");
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

    sendPing();
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
    setIsTracking(true);
  }, []);

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
