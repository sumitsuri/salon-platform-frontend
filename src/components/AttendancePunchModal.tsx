"use client";

import { OverlayPortal } from "@/components/OverlayPortal";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Clock, LogOut, MapPin, Upload, UserCheck, X } from "lucide-react";
import { SelfieCameraStage, SelfieEffectBar } from "@/components/employee/SelfieCameraStage";
import { bakeSelfieJpeg, type SelfieFilterId } from "@/lib/selfie-filters";
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

export function AttendancePunchModal({ open, ...props }: Props) {
  if (!open) return null;
  return <AttendancePunchModalOpen {...props} />;
}

function AttendancePunchModalOpen({ staff, branch, action, existingRecord, onClose, onSuccess }: Omit<Props, "open">) {
  const t = useTranslations("manager.attendance");
  const tCommon = useTranslations("common");
  const tUi = useTranslations("components.ui");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [location, setLocation] = useState<LocationFix | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFromFile, setPreviewFromFile] = useState(false);
  const [filterId, setFilterId] = useState<SelfieFilterId>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);

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
    setPreviewFromFile(false);
    setCameraError("");
    setConfirmCheckout(false);
  }, [stopCamera]);

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
    const id = window.setTimeout(() => refreshLocation(), 0);
    return () => window.clearTimeout(id);
  }, [refreshLocation]);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!secureContext) {
        setCameraError(t("cameraNeedsHttps"));
        return;
      }
      try {
        const stream = await openCameraStream("user");
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch (err) {
        if (!cancelled) setCameraError(t(classifyCameraError(err, secureContext)));
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [preview, secureContext, stopCamera, t]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreviewFromFile(false);
    setPreview(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
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
        setPreviewFromFile(true);
        setPreview(reader.result);
        stopCamera();
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
      const filtered = await bakeSelfieJpeg(preview, filterId);
      const jpeg = await normalizePhotoToJpeg(filtered);
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

  return (
    <OverlayPortal>
    <div className="fixed inset-0 z-[200] flex flex-col bg-black" data-testid="attendance-punch-modal">
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div>
            <p className="font-semibold text-white">{staff.name}</p>
            <p className="text-xs text-white/70 flex items-center gap-1.5">
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
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            disabled={submitting}
            aria-label={tUi("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[34%] space-y-2 overflow-y-auto px-4 pb-2">
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

        </div>

        <SelfieCameraStage
          videoRef={videoRef}
          previewUrl={preview}
          filterId={filterId}
          showGuide
          mirrored={!previewFromFile}
        />

        {!preview && (
          <p className="py-2 text-center text-xs font-medium text-white/80">{t("selfieHint")}</p>
        )}

        <div className="mt-auto flex flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <SelfieEffectBar
            value={filterId}
            onChange={setFilterId}
            label={t("effects")}
            nameFor={(id) => t(`filters.${id}`)}
          />

          {preview ? (
            <div className="flex gap-2">
              <button type="button" onClick={resetCapture} className={`${btnSecondary} flex-1 min-h-12`} disabled={submitting}>
                {t("retakePhoto")}
              </button>
              <button
                type="button"
                onClick={handlePrimaryAction}
                className={`${btnPrimary} flex-1 min-h-12 ${isCheckOut ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : ""}`}
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
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6">
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
                className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium text-white"
                data-testid="upload-selfie-button"
              >
                <Upload className="w-4 h-4" />
                {t("uploadSelfie")}
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={submitting}
                aria-label={t("capturePhoto")}
                data-testid="open-camera-button"
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-4 border-white bg-transparent"
              >
                <span className="h-14 w-14 rounded-full bg-white" />
              </button>
            </div>
          )}
        </div>
    </div>
    </OverlayPortal>
  );
}
