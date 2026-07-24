"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Camera, Clock, LogOut, MapPin, Upload, UserCheck, X } from "lucide-react";
import { api, AttendanceRecord, Branch, StaffItem } from "@/lib/api";
import { evaluateGeofence, formatCoords, geoStatusLabel } from "@/lib/attendance-geo";
import {
  acquireLocation,
  classifyCameraError,
  geolocationErrorKey,
  isLikelyMobileDevice,
  normalizePhotoToJpeg,
  openCameraStream,
  type LocationFix,
} from "@/lib/attendance-punch-media";
import { cn } from "@/lib/utils";
import { AlertBanner, btnPrimary, btnSecondary } from "@/components/ui";

type CameraMode = "choose" | "live";

interface Props {
  staff: StaffItem;
  branch?: Branch | null;
  open: boolean;
  action: "CHECK_IN" | "CHECK_OUT";
  existingRecord?: AttendanceRecord | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function hoursSoFar(entryTime?: string) {
  if (!entryTime) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(entryTime).getTime()) / 60000));
  return formatDuration(mins);
}

export function AttendancePunchModal({ staff, branch, open, action, existingRecord, onClose, onSuccess }: Props) {
  const t = useTranslations("manager.attendance");
  const tCommon = useTranslations("common");
  const tUi = useTranslations("components.ui");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [location, setLocation] = useState<LocationFix | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [cameraMode, setCameraMode] = useState<CameraMode>("choose");
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const isCheckOut = action === "CHECK_OUT";
  const secureContext = typeof window !== "undefined" ? window.isSecureContext : true;

  const geofenceCapableDevice = isLikelyMobileDevice();
  const liveGeo = evaluateGeofence(location?.latitude, location?.longitude, branch, {
    accuracyMeters: location?.accuracyMeters,
    highAccuracy: location?.highAccuracy,
    geofenceCapableDevice,
  });
  const outOfGeofence = liveGeo.status === "OUT_OF_GEOFENCE";
  const approximateLocation = liveGeo.approximateLocation === true;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const resetCapture = useCallback(() => {
    stopCamera();
    setPreview(null);
    setCameraMode("choose");
    setCameraError("");
    setConfirmCheckout(false);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!secureContext) {
      setCameraError(t("cameraNeedsHttps"));
      setCameraMode("choose");
      return;
    }
    setCameraError("");
    setCameraStarting(true);
    setCameraMode("live");
    try {
      const stream = await openCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraMode("choose");
      setCameraError(t(classifyCameraError(err, secureContext)));
    } finally {
      setCameraStarting(false);
    }
  }, [secureContext, t]);

  const refreshLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError("");
    setLocation(null);
    acquireLocation()
      .then((fix) => {
        setLocation(fix);
        setLocationError("");
      })
      .catch((err) => {
        setLocationError(t(geolocationErrorKey(err)));
      })
      .finally(() => setLocationLoading(false));
  }, [t]);

  useEffect(() => {
    if (!open) {
      resetCapture();
      setLocation(null);
      setLocationLoading(false);
      setLocationError("");
      setSubmitError("");
      return;
    }
    refreshLocation();
  }, [open, refreshLocation, resetCapture]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
    setCameraMode("choose");
  }

  function handleFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      setSubmitError(t("photoInvalidType"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview(reader.result);
        stopCamera();
        setCameraMode("choose");
        setSubmitError("");
      }
    };
    reader.onerror = () => setSubmitError(t("photoDecodeFailed"));
    reader.readAsDataURL(file);
  }

  async function submitPunch() {
    if (!preview || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const jpeg = await normalizePhotoToJpeg(preview);
      const result = await api.verifiedPunch(
        {
          staffId: staff.id,
          action,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracyMeters: location?.accuracyMeters,
          locationHighAccuracy: geofenceCapableDevice && location?.highAccuracy === true,
        },
        jpeg
      );
      onSuccess(result.message);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : tCommon("failed");
      if (msg.includes("PHOTO") || msg.includes("Photo")) {
        setSubmitError(t("photoDecodeFailed"));
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
      setConfirmCheckout(false);
    }
  }

  function handlePrimaryAction() {
    if (!preview || submitting) return;
    if (isCheckOut && !confirmCheckout) {
      setConfirmCheckout(true);
      return;
    }
    void submitPunch();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={tUi("close")} />
      <div
        className="relative w-full sm:max-w-md bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        data-testid="attendance-punch-modal"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{staff.name}</p>
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
              {isCheckOut ? (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  {t("checkOutTitle")}
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  {t("checkInTitle")}
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-muted)]" disabled={submitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isCheckOut && existingRecord?.entryTime && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Clock className="w-4 h-4 shrink-0" />
                {t("checkedInAt", { time: formatTime(existingRecord.entryTime) })}
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t("timeOnSiteSoFar", { duration: hoursSoFar(existingRecord.entryTime) })}
              </p>
            </div>
          )}

          {branch && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 space-y-2 text-xs">
              <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {t("branchGeofence")}
              </p>
              <p className="text-[var(--text-secondary)]">
                {t("expectedLocation")}: {formatCoords(branch.latitude, branch.longitude)}
              </p>
              <p className="text-[var(--text-secondary)]">
                {t("allowedRadius")}: {branch.geofenceRadiusMeters ?? 150}m
              </p>
              {location ? (
                <p
                  className={cn(
                    "font-medium",
                    outOfGeofence ? "text-amber-700" : approximateLocation ? "text-[var(--text-secondary)]" : "text-emerald-700"
                  )}
                >
                  {t("yourLocation")}: {formatCoords(location.latitude, location.longitude)} ·{" "}
                  {approximateLocation
                    ? t("gpsApproximate", { accuracy: Math.round(location.accuracyMeters) })
                    : t("gpsReady", { accuracy: Math.round(location.accuracyMeters) })}{" "}
                  {liveGeo.distanceMeters != null ? `· ${liveGeo.distanceMeters}m ${t("fromBranch")}` : ""} ·{" "}
                  {geoStatusLabel(liveGeo.status)}
                </p>
              ) : locationLoading ? (
                <p className="text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                  {t("gpsLocating")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-amber-700 font-medium">{locationError || t("gpsUnavailable")}</p>
                  <p className="text-[var(--text-secondary)]">{t("gpsProceedHint")}</p>
                  <button
                    type="button"
                    onClick={refreshLocation}
                    className="text-xs font-semibold text-[var(--brand-text)] hover:opacity-80"
                    data-testid="gps-retry-button"
                  >
                    {t("retryGps")}
                  </button>
                </div>
              )}
            </div>
          )}


          {approximateLocation && (
            <AlertBanner variant="warning">
              <p className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {t("approximateLocationWarning")}
              </p>
              <p className="text-sm mt-1">{t("approximateLocationDetail")}</p>
            </AlertBanner>
          )}

          {outOfGeofence && (
            <AlertBanner variant="warning">
              <p className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {t("outsideGeofenceWarning")}
              </p>
              <p className="text-sm mt-1">
                {t("outsideGeofenceDetail", {
                  distance: liveGeo.distanceMeters ?? 0,
                  radius: liveGeo.radius ?? branch?.geofenceRadiusMeters ?? 150,
                })}
              </p>
            </AlertBanner>
          )}

          {cameraError && <AlertBanner variant="warning">{cameraError}</AlertBanner>}
          {submitError && <AlertBanner variant="error">{submitError}</AlertBanner>}

          {confirmCheckout && (
            <AlertBanner variant="warning">
              <p className="font-medium">{t("confirmCheckoutTitle")}</p>
              <p className="text-sm mt-1">{t("confirmCheckoutBody", { duration: hoursSoFar(existingRecord?.entryTime) })}</p>
            </AlertBanner>
          )}

          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--surface-muted)] border border-[var(--border)]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t("capturedPhoto")} className="w-full h-full object-cover" />
            ) : cameraMode === "live" ? (
              <>
                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover mirror" />
                {!cameraStarting && (
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-xs text-white/90 text-center">{t("captureHint")}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                <p className="text-xs text-center text-[var(--text-secondary)] max-w-[16rem]">{t("selfieStepHint")}</p>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    disabled={cameraStarting || submitting}
                    className={`${btnPrimary} flex-1 text-sm`}
                    data-testid="open-camera-button"
                  >
                    <Camera className="w-4 h-4" />
                    {cameraStarting ? tCommon("processing") : t("openCamera")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className={`${btnSecondary} flex-1 text-sm`}
                    data-testid="upload-selfie-button"
                  >
                    <Upload className="w-4 h-4" />
                    {t("uploadSelfie")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {preview ? (
              <>
                <button type="button" onClick={resetCapture} className={`${btnSecondary} flex-1`} disabled={submitting}>
                  {t("retakePhoto")}
                </button>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className={`${btnPrimary} flex-1 ${isCheckOut ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : ""}`}
                  disabled={submitting}
                  data-testid="attendance-confirm-punch"
                >
                  {submitting
                    ? tCommon("processing")
                    : confirmCheckout
                      ? t("confirmCheckoutBtn")
                      : isCheckOut
                        ? t("proceedCheckout")
                        : t("confirmPunch")}
                </button>
              </>
            ) : cameraMode === "live" ? (
              <button type="button" onClick={capturePhoto} disabled={cameraStarting || submitting} className={`${btnPrimary} w-full`}>
                <Camera className="w-4 h-4" />
                {t("capturePhoto")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <style jsx global>{`
        video.mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
