import { AttendanceRecord, Branch, GeoStatus } from "@/lib/api";

/** Network / coarse fixes above this are not trusted for geofence OUT. */
export const MAX_GEOFENCE_ACCURACY_METERS = 200;

export function formatCoords(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Minimum distance (m) vs reported accuracy that indicates a lying browser fix (desktop Wi‑Fi / Core Location). */
export const SUSPICIOUS_GEOFENCE_DISTANCE_METERS = 500;

export function isSuspiciousGeofenceFix(distanceMeters: number, accuracyMeters?: number | null, radius = 150) {
  if (accuracyMeters == null || accuracyMeters <= 0) return false;
  const threshold = Math.max(SUSPICIOUS_GEOFENCE_DISTANCE_METERS, radius * 3);
  // e.g. 13185m away but browser claims ±16m — not trustworthy for geofence OUT
  return distanceMeters > threshold && accuracyMeters < distanceMeters / 10;
}

export interface GeofenceEvaluation {
  status: GeoStatus;
  distanceMeters: number | null;
  radius: number | null;
  /** Wi‑Fi / IP fix — coordinates shown but geofence not enforced. */
  approximateLocation?: boolean;
  approximateReason?: "device" | "network" | "suspicious";
}

export function evaluateGeofence(
  lat?: number | null,
  lng?: number | null,
  branch?: Pick<Branch, "latitude" | "longitude" | "geofenceRadiusMeters"> | null,
  opts?: {
    accuracyMeters?: number | null;
    highAccuracy?: boolean;
    /** Phones/tablets at branch; desktops should not enforce geofence OUT. */
    geofenceCapableDevice?: boolean;
  }
): GeofenceEvaluation {
  if (lat == null || lng == null) {
    return { status: "GPS_UNAVAILABLE", distanceMeters: null, radius: branch?.geofenceRadiusMeters ?? null };
  }
  if (branch?.latitude == null || branch?.longitude == null) {
    return { status: "GPS_UNAVAILABLE", distanceMeters: null, radius: branch?.geofenceRadiusMeters ?? null };
  }

  const radius = branch.geofenceRadiusMeters ?? 150;
  const distanceMeters = Math.round(haversineMeters(lat, lng, branch.latitude, branch.longitude));
  const accuracy = opts?.accuracyMeters ?? null;

  const approximate = (reason?: "device" | "network" | "suspicious") => ({
    status: "GPS_UNAVAILABLE" as GeoStatus,
    distanceMeters,
    radius,
    approximateLocation: true as const,
    approximateReason: reason,
  });

  // Laptops/desktops lack GPS; macOS may still return a "high accuracy" Wi‑Fi fix that is km off.
  if (opts?.geofenceCapableDevice === false) {
    return approximate("device");
  }

  // Network tier fallback — never flag OUT.
  if (opts?.highAccuracy === false) {
    return approximate("network");
  }

  if (isSuspiciousGeofenceFix(distanceMeters, accuracy, radius)) {
    return approximate("suspicious");
  }

  if (accuracy != null && accuracy > MAX_GEOFENCE_ACCURACY_METERS) {
    return { status: "GPS_UNAVAILABLE", distanceMeters, radius };
  }

  // Confidence-aware: only OUT when clearly outside uncertainty circle.
  if (accuracy != null) {
    if (distanceMeters + accuracy <= radius) {
      return { status: "IN_GEOFENCE", distanceMeters, radius };
    }
    if (distanceMeters - accuracy > radius) {
      return { status: "OUT_OF_GEOFENCE", distanceMeters, radius };
    }
    return { status: "GPS_UNAVAILABLE", distanceMeters, radius };
  }

  return {
    status: distanceMeters <= radius ? "IN_GEOFENCE" : "OUT_OF_GEOFENCE",
    distanceMeters,
    radius,
  };
}

export function geoStatusLabel(status?: GeoStatus) {
  switch (status) {
    case "IN_GEOFENCE":
      return "In";
    case "OUT_OF_GEOFENCE":
      return "Out";
    default:
      return "No GPS";
  }
}

export function formatPunchGeo(record: AttendanceRecord, type: "entry" | "exit") {
  const lat = type === "entry" ? record.entryLatitude : record.exitLatitude;
  const lng = type === "entry" ? record.entryLongitude : record.exitLongitude;
  const status = type === "entry" ? record.entryGeoStatus : record.exitGeoStatus;
  const distance = type === "entry" ? record.entryDistanceMeters : record.exitDistanceMeters;
  const radius = record.geofenceRadiusMeters;
  if (lat == null && lng == null && !status) return "—";
  const coords = formatCoords(lat, lng);
  if (radius == null) return coords;
  const label = geoStatusLabel(status);
  if (distance != null) {
    return `${radius}m · ${label} (${distance}m)`;
  }
  return `${radius}m · ${label} · ${coords}`;
}
