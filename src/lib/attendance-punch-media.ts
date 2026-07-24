/** GPS + photo helpers for verified attendance punch. */

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

type GeoErrorKey = "gpsPermissionDenied" | "gpsTimeout" | "gpsUnavailable";

function getCurrentPosition(options: PositionOptions): Promise<LocationFix> {
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

/**
 * Tiered geolocation: network/Wi‑Fi first (works on desktop), then GPS chip (mobile).
 * Root cause of desktop timeouts: enableHighAccuracy:true waits for hardware GPS Macs lack.
 */
export async function acquireLocation(): Promise<LocationFix> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw Object.assign(new Error("GPS_UNSUPPORTED"), { code: 0 });
  }

  const tiers: PositionOptions[] = [
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  ];

  let lastError: unknown;
  for (const options of tiers) {
    try {
      return await getCurrentPosition(options);
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
