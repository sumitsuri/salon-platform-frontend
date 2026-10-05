"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, RotateCcw, SwitchCamera, Upload, X } from "lucide-react";
import type { FaceCaptureZone, FaceLightMode } from "@/lib/api";
import {
  classifyCameraError,
  normalizePhotoToJpeg,
  openCameraStream,
  type CameraFacingMode,
} from "@/lib/attendance-punch-media";
import { OverlayPortal } from "@/components/OverlayPortal";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary } from "@/components/ui";

const LIGHT_PREVIEW_CLASS: Record<FaceLightMode, string> = {
  WHITE: "",
  CROSS_POLARIZED: "contrast-125 saturate-50 brightness-105",
  UV: "hue-rotate-60 contrast-150 saturate-200 brightness-90",
};

export function FaceScanCapturePanel({
  zone,
  lightMode,
  onCaptured,
  disabled,
}: {
  zone: FaceCaptureZone;
  lightMode: FaceLightMode;
  onCaptured: (blob: Blob) => Promise<void>;
  disabled?: boolean;
}) {
  const t = useTranslations("manager.faceScan");
  const tUi = useTranslations("components.ui");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveFacingRef = useRef<CameraFacingMode>("user");
  const [mode, setMode] = useState<"idle" | "live" | "preview">("idle");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [saving, setSaving] = useState(false);
  const [facing, setFacing] = useState<CameraFacingMode>("user");
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const secureContext = typeof window !== "undefined" ? window.isSecureContext : true;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopCamera();
    setPreviewDataUrl(null);
    setMode("idle");
    setCameraError("");
  }, [stopCamera]);

  const attachStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play();
  }, []);

  const startCameraWithFacing = useCallback(
    (facingMode: CameraFacingMode) => {
      if (!secureContext) {
        setCameraError(t("cameraNeedsHttps"));
        return;
      }
      setCameraError("");
      liveFacingRef.current = facingMode;
      setMode("live");
      setLiveTick((n) => n + 1);
    },
    [secureContext, t],
  );

  useEffect(() => {
    if (mode !== "live") return;

    let cancelled = false;
    const facingMode = liveFacingRef.current;

    (async () => {
      try {
        stopCamera();
        const stream = await openCameraStream(facingMode);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        await attachStream(stream);
        if (!cancelled) setFacing(facingMode);
      } catch (err) {
        if (!cancelled) {
          setMode("idle");
          setCameraError(t(classifyCameraError(err, secureContext)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, liveTick, attachStream, stopCamera, secureContext, t]);

  useEffect(() => {
    if (mode !== "live" && mode !== "preview") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  const startCamera = useCallback(() => startCameraWithFacing(facing), [facing, startCameraWithFacing]);

  const flipCamera = useCallback(() => {
    if (mode !== "live" || switchingCamera) return;
    const next: CameraFacingMode = facing === "environment" ? "user" : "environment";
    setSwitchingCamera(true);
    setCameraError("");
    liveFacingRef.current = next;
    setLiveTick((n) => n + 1);
    setSwitchingCamera(false);
  }, [facing, mode, switchingCamera]);

  const snap = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    stopCamera();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setPreviewDataUrl(dataUrl);
    setMode("preview");
  }, [stopCamera, facing]);

  const onFile = useCallback(async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setPreviewDataUrl(dataUrl);
    setMode("preview");
  }, []);

  const confirm = useCallback(async () => {
    if (!previewDataUrl) return;
    setSaving(true);
    try {
      const jpeg = await normalizePhotoToJpeg(previewDataUrl);
      await onCaptured(jpeg);
      reset();
    } finally {
      setSaving(false);
    }
  }, [onCaptured, previewDataUrl, reset]);

  const facingLabel = facing === "user" ? t("capture.facingFront") : t("capture.facingBack");
  const captureLabel = `${t(`zones.${zone}`)} · ${t(`lights.${lightMode}`)}`;

  const fullscreenOverlay =
    mode === "live" || mode === "preview" ? (
      <OverlayPortal>
        <div className="fixed inset-0 z-[200] flex flex-col bg-black touch-none">
          <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{captureLabel}</p>
              {mode === "live" && <p className="text-xs text-white/70">{facingLabel}</p>}
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white"
              onClick={reset}
              disabled={saving}
              aria-label={tUi("close")}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            {mode === "live" && (
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  facing === "user" && "scale-x-[-1]",
                  LIGHT_PREVIEW_CLASS[lightMode],
                )}
              />
            )}
            {mode === "preview" && previewDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDataUrl}
                alt=""
                className={cn("absolute inset-0 h-full w-full object-contain", LIGHT_PREVIEW_CLASS[lightMode])}
              />
            )}
            {mode === "live" && switchingCamera && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
                {t("capture.saving")}
              </div>
            )}
          </div>

          {cameraError && mode === "live" && (
            <p className="px-4 py-2 text-center text-xs text-rose-300">{cameraError}</p>
          )}

          <div className="relative z-10 flex flex-wrap justify-center gap-2 border-t border-white/10 bg-black/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
            {mode === "live" && (
              <>
                <button
                  type="button"
                  className={cn(btnPrimary, "min-h-12 flex-1 min-w-[8rem] max-w-xs text-base")}
                  disabled={disabled || switchingCamera}
                  onClick={() => void snap()}
                >
                  {t("capture.snap")}
                </button>
                <button
                  type="button"
                  className={cn(btnSecondary, "min-h-12 border-white/20 bg-white/10 text-white hover:bg-white/15")}
                  disabled={switchingCamera}
                  onClick={() => void flipCamera()}
                >
                  <SwitchCamera className="h-4 w-4" aria-hidden />
                  {t("capture.switchCamera")}
                </button>
              </>
            )}
            {mode === "preview" && (
              <>
                <button
                  type="button"
                  className={cn(btnPrimary, "min-h-12 flex-1 min-w-[8rem] max-w-xs")}
                  disabled={disabled || saving}
                  onClick={() => void confirm()}
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {saving ? t("capture.saving") : t("capture.saveShot")}
                </button>
                <button
                  type="button"
                  className={cn(btnSecondary, "min-h-12 border-white/20 bg-white/10 text-white hover:bg-white/15")}
                  disabled={saving}
                  onClick={() => {
                    setPreviewDataUrl(null);
                    startCameraWithFacing(facing);
                  }}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {t("capture.retake")}
                </button>
              </>
            )}
          </div>
        </div>
      </OverlayPortal>
    ) : null;

  return (
    <>
      {fullscreenOverlay}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">{captureLabel}</p>

        {cameraError && mode === "idle" && <p className="mb-2 text-xs text-rose-600">{cameraError}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={disabled} onClick={() => void startCamera()}>
            <Camera className="h-4 w-4" aria-hidden />
            {t("capture.openCamera")}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {t("capture.upload")}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={disabled}
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            title={facingLabel}
          >
            <SwitchCamera className="h-4 w-4" aria-hidden />
            {facingLabel}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </>
  );
}
