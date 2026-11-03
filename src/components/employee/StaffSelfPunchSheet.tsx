"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  acquireLocation,
  classifyCameraError,
  geolocationErrorKey,
  normalizePhotoToJpeg,
  openCameraStream,
} from "@/lib/attendance-punch-media";
import { bakeSelfieJpeg, type SelfieFilterId } from "@/lib/selfie-filters";
import { OverlayPortal } from "@/components/OverlayPortal";
import { AlertBanner, btnPrimary, btnSecondary } from "@/components/ui";
import { SelfieCameraStage, SelfieEffectBar } from "@/components/employee/SelfieCameraStage";

interface Props {
  open: boolean;
  action: "CHECK_IN" | "CHECK_OUT";
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffSelfPunchSheet({ open, action, onClose, onSuccess }: Props) {
  if (!open) return null;
  return <StaffSelfPunchSheetOpen action={action} onClose={onClose} onSuccess={onSuccess} />;
}

function StaffSelfPunchSheetOpen({ action, onClose, onSuccess }: Omit<Props, "open">) {
  const t = useTranslations("employee.attendance");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [filterId, setFilterId] = useState<SelfieFilterId>("normal");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    (async () => {
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
      } catch (e) {
        if (!cancelled) {
          setError(t(classifyCameraError(e, window.isSecureContext) as "locationDenied"));
        }
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [preview, stopCamera, t]);

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

  function retake() {
    setPreview(null);
    setError("");
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
      const filtered = await bakeSelfieJpeg(preview, filterId);
      const photo = await normalizePhotoToJpeg(filtered);
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

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[200] flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="text-base font-bold text-white">
            {action === "CHECK_IN" ? t("checkIn") : t("checkOut")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label={t("cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="px-4 pb-2">
            <AlertBanner variant="error">{error}</AlertBanner>
          </div>
        )}

        <SelfieCameraStage videoRef={videoRef} previewUrl={preview} filterId={filterId} showGuide />

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
            <>
              <p className="flex items-center justify-center gap-2 text-sm text-white/80">
                <MapPin className="h-4 w-4" />
                {t("confirmPunch")}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={retake} className={`${btnSecondary} flex-1`} disabled={busy}>
                  {t("retake")}
                </button>
                <button type="button" onClick={submit} className={`${btnPrimary} flex-1`} disabled={busy}>
                  {busy ? t("submitting") : t("submitPunch")}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={capture}
              aria-label={t("capturePhoto")}
              className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-4 border-white bg-transparent"
            >
              <span className="h-14 w-14 rounded-full bg-white" />
            </button>
          )}
        </div>
      </div>
    </OverlayPortal>
  );
}
