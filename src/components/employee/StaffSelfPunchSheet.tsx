"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, MapPin, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  acquireLocation,
  classifyCameraError,
  geolocationErrorKey,
  normalizePhotoToJpeg,
  openCameraStream,
} from "@/lib/attendance-punch-media";
import { OverlayPortal } from "@/components/OverlayPortal";
import { AlertBanner, btnPrimary, btnSecondary } from "@/components/ui";

interface Props {
  open: boolean;
  action: "CHECK_IN" | "CHECK_OUT";
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffSelfPunchSheet({ open, action, onClose, onSuccess }: Props) {
  const t = useTranslations("employee.attendance");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPreview(null);
      setError("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await openCameraStream("user");
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(t(classifyCameraError(e, window.isSecureContext) as "locationDenied"));
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  function capture() {
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
  }

  async function submit() {
    if (!preview) {
      setError(t("photoRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const loc = await acquireLocation();
      const photo = await normalizePhotoToJpeg(preview);
      await api.staffPortalPunch(
        {
          action,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracyMeters: loc.accuracyMeters,
          locationHighAccuracy: loc.highAccuracy,
        },
        photo,
      );
      onSuccess();
      onClose();
    } catch (e) {
      const key = geolocationErrorKey(e);
      setError(key ? t(key as "locationDenied") : e instanceof Error ? e.message : t("punchFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {action === "CHECK_IN" ? t("checkIn") : t("checkOut")}
            </h2>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--surface-muted)]">
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-3">
              <AlertBanner variant="error">{error}</AlertBanner>
            </div>
          )}

          {!preview ? (
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="h-full w-full object-cover mirror" playsInline muted autoPlay />
              <button
                type="button"
                onClick={capture}
                className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
              >
                <Camera className="h-4 w-4" />
                {t("capturePhoto")}
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t("confirmPunch")}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className={`${btnSecondary} flex-1`} disabled={busy}>
              {t("cancel")}
            </button>
            <button type="button" onClick={submit} className={`${btnPrimary} flex-1`} disabled={busy || !preview}>
              {busy ? t("submitting") : t("submitPunch")}
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
