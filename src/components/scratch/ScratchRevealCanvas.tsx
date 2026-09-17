"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BRUSH = 36;
const REVEAL_THRESHOLD = 18;

export function ScratchRevealCanvas({
  revealed,
  exiting,
  onRevealThreshold,
  accentColor,
  foilLabel,
  className,
}: {
  revealed: boolean;
  exiting?: boolean;
  /** Fired once when enough foil is scratched — triggers server reveal */
  onRevealThreshold: () => void;
  accentColor?: string;
  foilLabel?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const thresholdSentRef = useRef(false);
  const interactionStartedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointsRef = useRef<{ x: number; y: number }[]>([]);

  const paintOverlay = useCallback(() => {
    if (interactionStartedRef.current || revealed) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, accentColor ? `${accentColor}ee` : "#64748bee");
    gradient.addColorStop(0.5, accentColor ? `${accentColor}cc` : "#7c8aa8cc");
    gradient.addColorStop(1, accentColor ? `${accentColor}99` : "#94a3b899");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(foilLabel || "Scratch here", rect.width / 2, rect.height / 2);
  }, [accentColor, foilLabel, revealed]);

  useEffect(() => {
    paintOverlay();
    const ro = new ResizeObserver(() => paintOverlay());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [paintOverlay]);

  function measureProgress() {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const dpr = window.devicePixelRatio || 1;
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    let samples = 0;
    const stride = 4 * Math.max(2, Math.floor(dpr * 2));
    for (let i = 3; i < sample.data.length; i += stride) {
      samples++;
      if (sample.data[i] === 0) cleared++;
    }
    if (samples === 0) return 0;
    return Math.min(100, Math.round((cleared / samples) * 100));
  }

  function maybeSendThreshold(pct: number) {
    setProgress(pct);
    if (!thresholdSentRef.current && pct >= REVEAL_THRESHOLD) {
      thresholdSentRef.current = true;
      onRevealThreshold();
    }
  }

  function drawBrush(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    const stamp = (px: number, py: number, radius: number) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.65, "rgba(0,0,0,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    stamp(x, y, BRUSH);
  }

  function flushScratchBatch() {
    rafRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const points = pendingPointsRef.current.splice(0);
    if (points.length === 0) return;

    interactionStartedRef.current = true;
    let last = lastPointRef.current;
    for (const p of points) {
      if (last) {
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / (BRUSH * 0.45)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          drawBrush(last.x + dx * t, last.y + dy * t);
        }
      } else {
        drawBrush(p.x, p.y);
      }
      last = p;
    }
    lastPointRef.current = last;
    maybeSendThreshold(measureProgress());
  }

  function queuePoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const rect = canvas.getBoundingClientRect();
    pendingPointsRef.current.push({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(flushScratchBatch);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    lastPointRef.current = null;
    queuePoint(e.clientX, e.clientY);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!(e.buttons & 1)) return;
    queuePoint(e.clientX, e.clientY);
  }

  if (revealed && !exiting) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] scratch-foil-shell",
        exiting && "scratch-foil-exit",
        className
      )}
    >
      <div
        ref={containerRef}
        className="relative flex min-h-[200px] items-center justify-center bg-gradient-to-br from-amber-100/90 via-yellow-50 to-violet-100/80 px-4 py-8 dark:from-amber-950/40 dark:to-violet-950/30"
      >
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-dashed border-amber-400/35" />
        <div className="pointer-events-none text-center opacity-50">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-900/70">★ ★ ★</p>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing min-h-[180px] will-change-transform"
          aria-label="Scratch to reveal reward"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        />
      </div>
      {progress > 0 && (
        <p className="absolute bottom-2 right-3 text-[10px] font-medium tabular-nums text-white/90 drop-shadow">
          {progress}%
        </p>
      )}
    </div>
  );
}
