import { AttendanceRecord, Branch, GeoStatus } from "@/lib/api";

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

export function evaluateGeofence(
  lat?: number | null,
  lng?: number | null,
  branch?: Pick<Branch, "latitude" | "longitude" | "geofenceRadiusMeters"> | null
): { status: GeoStatus; distanceMeters: number | null; radius: number | null } {
  if (lat == null || lng == null) {
    return { status: "GPS_UNAVAILABLE", distanceMeters: null, radius: branch?.geofenceRadiusMeters ?? null };
  }
  if (branch?.latitude == null || branch?.longitude == null) {
    return { status: "GPS_UNAVAILABLE", distanceMeters: null, radius: branch?.geofenceRadiusMeters ?? null };
  }
  const radius = branch.geofenceRadiusMeters ?? 150;
  const distanceMeters = haversineMeters(lat, lng, branch.latitude, branch.longitude);
  return {
    status: distanceMeters <= radius ? "IN_GEOFENCE" : "OUT_OF_GEOFENCE",
    distanceMeters: Math.round(distanceMeters),
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
