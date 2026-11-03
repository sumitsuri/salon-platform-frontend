"use client";

import { OverlayPortal } from "@/components/OverlayPortal";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Upload, UserCheck, X } from "lucide-react";
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
import { btnPrimary, btnSecondary } from "@/components/ui";

interface Props {
  staff: StaffItem;
  branch?: Branch | null;
  open: boolean;
  action: "CHECK_IN" | "CHECK_OUT";
  existingRecord?: AttendanceRecord | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
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

  const gpsLine = locationLoading && !location
    ? t("gpsLocating")
    : location
      ? `${t("yourLocation")}: ${formatCoords(location.latitude, location.longitude)} · ${
          approximateLocation
            ? t("gpsApproximate", { accuracy: Math.round(location.accuracyMeters) })
            : t("gpsReady", { accuracy: Math.round(location.accuracyMeters) })
        }${liveGeo.distanceMeters != null ? ` · ${liveGeo.distanceMeters}m ${t("fromBranch")}` : ""} · ${geoStatusLabel(liveGeo.status)}`
      : locationError || t("gpsUnavailable");

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[200] bg-black" data-testid="attendance-punch-modal">
        <div className="relative mx-auto h-full w-full max-w-[28rem]">
          <SelfieCameraStage
            videoRef={videoRef}
            previewUrl={preview}
            filterId={filterId}
            showGuide
            mirrored={!previewFromFile}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 to-transparent" />

          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white drop-shadow">{staff.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-white/80">
                  {isCheckOut ? <LogOut className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  {isCheckOut ? t("checkOutTitle") : t("checkInTitle")}
                  {isCheckOut && existingRecord?.entryTime
                    ? ` · ${t("timeOnSiteSoFar", { duration: hoursSoFar(existingRecord.entryTime) })}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 text-white"
                disabled={submitting}
                aria-label={tUi("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="truncate px-4 pt-1 text-center text-[11px] text-white/85 drop-shadow">{gpsLine}</p>
            {!location && !locationLoading && (
              <button
                type="button"
                onClick={refreshLocation}
                className="mx-auto text-[11px] font-semibold text-white underline"
                data-testid="gps-retry-button"
              >
                {t("retryGps")}
              </button>
            )}
            {outOfGeofence && (
              <p className="truncate px-4 text-center text-[11px] font-medium text-amber-200">
                {t("outsideGeofenceWarning")}
                {liveGeo.distanceMeters != null
                  ? ` · ${t("outsideGeofenceDetail", {
                      distance: liveGeo.distanceMeters,
                      radius: liveGeo.radius ?? branch?.geofenceRadiusMeters ?? 150,
                    })}`
                  : ""}
              </p>
            )}
            {cameraError && <p className="truncate px-4 text-center text-[11px] text-amber-200">{cameraError}</p>}
            {submitError && <p className="truncate px-4 text-center text-[11px] text-red-300">{submitError}</p>}

            <div className="mt-auto flex flex-col gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {confirmCheckout && (
                <p className="text-center text-xs text-white">
                  {t("confirmCheckoutTitle")} {t("confirmCheckoutBody", { duration: hoursSoFar(existingRecord?.entryTime) })}
                </p>
              )}
              {!preview && (
                <p className="text-center text-xs font-medium text-white/90 drop-shadow">{t("selfieHint")}</p>
              )}
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
                <div className="flex items-center justify-center gap-5">
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
                    className="flex h-11 items-center gap-1.5 rounded-full bg-black/45 px-3 text-xs font-medium text-white"
                    data-testid="upload-selfie-button"
                  >
                    <Upload className="h-4 w-4" />
                    {t("uploadSelfie")}
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={submitting}
                    aria-label={t("capturePhoto")}
                    data-testid="open-camera-button"
                    className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-4 border-white bg-transparent"
                  >
                    <span className="h-[3.15rem] w-[3.15rem] rounded-full bg-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
