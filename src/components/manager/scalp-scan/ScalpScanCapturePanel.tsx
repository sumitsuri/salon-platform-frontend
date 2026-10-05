"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, RotateCcw, SwitchCamera, Upload } from "lucide-react";
import type { ScalpCaptureZone, ScalpLightMode } from "@/lib/api";
import {
  classifyCameraError,
  normalizePhotoToJpeg,
  openCameraStream,
  type CameraFacingMode,
} from "@/lib/attendance-punch-media";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary } from "@/components/ui";

const LIGHT_PREVIEW_CLASS: Record<ScalpLightMode, string> = {
  WHITE: "",
  CROSS_POLARIZED: "contrast-125 saturate-50 brightness-105",
  UV: "hue-rotate-60 contrast-150 saturate-200 brightness-90",
};

export function ScalpScanCapturePanel({
  zone,
  lightMode,
  onCaptured,
  disabled,
}: {
  zone: ScalpCaptureZone;
  lightMode: ScalpLightMode;
  onCaptured: (blob: Blob) => Promise<void>;
  disabled?: boolean;
}) {
  const t = useTranslations("manager.scalpScan");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"idle" | "live" | "preview">("idle");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [saving, setSaving] = useState(false);
  const [facing, setFacing] = useState<CameraFacingMode>("environment");
  const [switchingCamera, setSwitchingCamera] = useState(false);
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
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const startCameraWithFacing = useCallback(
    async (facingMode: CameraFacingMode) => {
      if (!secureContext) {
        setCameraError(t("cameraNeedsHttps"));
        return;
      }
      setCameraError("");
      setMode("live");
      try {
        stopCamera();
        const stream = await openCameraStream(facingMode);
        await attachStream(stream);
        setFacing(facingMode);
      } catch (err) {
        setMode("idle");
        setCameraError(t(classifyCameraError(err, secureContext)));
      }
    },
    [attachStream, secureContext, stopCamera, t],
  );

  const startCamera = useCallback(() => startCameraWithFacing(facing), [facing, startCameraWithFacing]);

  const flipCamera = useCallback(async () => {
    if (mode !== "live" || switchingCamera) return;
    const next: CameraFacingMode = facing === "environment" ? "user" : "environment";
    setSwitchingCamera(true);
    setCameraError("");
    try {
      stopCamera();
      const stream = await openCameraStream(next);
      await attachStream(stream);
      setFacing(next);
    } catch (err) {
      setCameraError(t(classifyCameraError(err, secureContext)));
      try {
        const stream = await openCameraStream(facing);
        await attachStream(stream);
      } catch {
        setMode("idle");
      }
    } finally {
      setSwitchingCamera(false);
    }
  }, [attachStream, facing, mode, secureContext, stopCamera, switchingCamera, t]);

  const snap = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    stopCamera();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setPreviewDataUrl(dataUrl);
    setMode("preview");
  }, [stopCamera]);

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

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
        {t(`zones.${zone}`)} · {t(`lights.${lightMode}`)}
      </p>

      {mode === "preview" && previewDataUrl && (
        <div className={cn("relative overflow-hidden rounded-lg ring-1 ring-[var(--border)]", LIGHT_PREVIEW_CLASS[lightMode])}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewDataUrl} alt="" className="max-h-64 w-full object-cover" />
        </div>
      )}

      {mode === "live" && (
        <div className="relative">
          <div className={cn("overflow-hidden rounded-lg bg-black", LIGHT_PREVIEW_CLASS[lightMode])}>
            <video ref={videoRef} playsInline muted className="max-h-64 w-full object-cover" />
          </div>
          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
            {facingLabel}
          </span>
        </div>
      )}

      {cameraError && <p className="mt-2 text-xs text-rose-600">{cameraError}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "idle" && (
          <>
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
          </>
        )}
        {mode === "live" && (
          <>
            <button type="button" className={btnPrimary} disabled={disabled || switchingCamera} onClick={() => void snap()}>
              {t("capture.snap")}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={switchingCamera}
              onClick={() => void flipCamera()}
            >
              <SwitchCamera className="h-4 w-4" aria-hidden />
              {switchingCamera ? t("capture.saving") : t("capture.switchCamera")}
            </button>
            <button type="button" className={btnSecondary} disabled={switchingCamera} onClick={reset}>
              {t("capture.cancel")}
            </button>
          </>
        )}
        {mode === "preview" && (
          <>
            <button type="button" className={btnPrimary} disabled={disabled || saving} onClick={() => void confirm()}>
              <Check className="h-4 w-4" aria-hidden />
              {saving ? t("capture.saving") : t("capture.saveShot")}
            </button>
            <button type="button" className={btnSecondary} disabled={saving} onClick={reset}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              {t("capture.retake")}
            </button>
          </>
        )}
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
  );
}
