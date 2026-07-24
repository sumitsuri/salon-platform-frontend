/** GPS + photo helpers for verified attendance punch. */

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  /** True when fix came from device GPS; false for Wi‑Fi / IP network location. */
  highAccuracy: boolean;
}

type GeoErrorKey = "gpsPermissionDenied" | "gpsTimeout" | "gpsUnavailable";

function getCurrentPosition(options: PositionOptions): Promise<Omit<LocationFix, "highAccuracy">> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        }),
      (err) => reject(err),
      options
    );
  });
}

/** Phones/tablets used for branch punch; desktops lack GPS and need different strategy. */
export function isLikelyMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/**
 * Geolocation for attendance geofence.
 * - Mobile: GPS chip first, network fallback (fallback is approximate — not used for geofence OUT).
 * - Desktop: GPS attempt first, then network for display only (never flags false OUT).
 *
 * Previous network-first tier caused 10km+ false "Outside geofence" on laptops (IP/Wi‑Fi geolocation).
 */
export async function acquireLocation(): Promise<LocationFix> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw Object.assign(new Error("GPS_UNSUPPORTED"), { code: 0 });
  }

  const tiers: Array<{ options: PositionOptions; highAccuracy: boolean }> = [
    { options: { enableHighAccuracy: true, timeout: isLikelyMobileDevice() ? 20000 : 15000, maximumAge: 0 }, highAccuracy: true },
    { options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 }, highAccuracy: false },
  ];

  const mobile = isLikelyMobileDevice();
  let lastError: unknown;
  for (const tier of tiers) {
    try {
      const fix = await getCurrentPosition(tier.options);
      // Desktop/macOS may satisfy enableHighAccuracy with Wi‑Fi — never trust for geofence OUT.
      return { ...fix, highAccuracy: mobile && tier.highAccuracy };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? Object.assign(new Error("GPS_FAILED"), { code: 2 });
}

export function geolocationErrorKey(err: unknown): GeoErrorKey {
  const code = typeof err === "object" && err !== null && "code" in err ? Number((err as { code: number }).code) : -1;
  if (code === 1) return "gpsPermissionDenied";
  if (code === 3) return "gpsTimeout";
  return "gpsUnavailable";
}

export type CameraErrorKey = "cameraNeedsHttps" | "cameraPermissionDenied" | "cameraNotFound" | "cameraUnavailable";

export function classifyCameraError(err: unknown, secureContext: boolean): CameraErrorKey {
  if (!secureContext) return "cameraNeedsHttps";
  const name =
    typeof err === "object" && err !== null && "name" in err ? String((err as { name: string }).name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "cameraPermissionDenied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "cameraNotFound";
  return "cameraUnavailable";
}

/** Normalize any captured/uploaded image to JPEG under ~900KB for API upload. */
export async function normalizePhotoToJpeg(dataUrl: string, maxDim = 1280, quality = 0.85): Promise<Blob> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      }
      if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("PHOTO_ENCODE_FAILED"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PHOTO_ENCODE_FAILED"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("PHOTO_DECODE_FAILED"));
    img.src = dataUrl;
  });

  if (blob.size > 950_000) {
    return normalizePhotoToJpeg(dataUrl, Math.round(maxDim * 0.75), Math.max(0.5, quality - 0.1));
  }
  return blob;
}

export async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("CAMERA_UNSUPPORTED"), { name: "NotSupportedError" });
  }
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "user" } }, audio: false },
    { video: { facingMode: "environment" }, audio: false },
    { video: true, audio: false },
  ];
  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? Object.assign(new Error("CAMERA_DENIED"), { name: "NotAllowedError" });
}
