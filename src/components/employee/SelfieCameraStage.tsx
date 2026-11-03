"use client";

import type { RefObject } from "react";
import { SELFIE_FILTERS, type SelfieFilterId, selfieFilterCss } from "@/lib/selfie-filters";
import { cn } from "@/lib/utils";

/**
 * Front-camera stage. The mirror lives on a wrapper that fills the frame, not on the
 * video element. Scaling the video itself makes object-fit crop from the left or right
 * edge, so the face sits off to one side.
 */
export function SelfieCameraStage({
  videoRef,
  previewUrl,
  filterId,
  showGuide,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  previewUrl: string | null;
  filterId: SelfieFilterId;
  showGuide: boolean;
}) {
  const filter = selfieFilterCss(filterId);
  return (
    <div className="relative min-h-0 flex-1 bg-black">
      <div className="absolute inset-0" style={{ transform: "scaleX(-1)" }}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{ filter }}
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{ filter }}
            playsInline
            muted
            autoPlay
          />
        )}
      </div>
      {showGuide && !previewUrl && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[58%] w-[70%] max-w-[18rem] rounded-[999px] border-2 border-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
        </div>
      )}
    </div>
  );
}

export function SelfieEffectBar({
  value,
  onChange,
  label,
  nameFor,
}: {
  value: SelfieFilterId;
  onChange: (id: SelfieFilterId) => void;
  label: string;
  nameFor: (id: SelfieFilterId) => string;
}) {
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-white/70">{label}</p>
      <div className="mx-auto flex w-max max-w-full gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SELFIE_FILTERS.map((filter) => {
          const selected = filter.id === value;
          const name = nameFor(filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.id)}
              aria-pressed={selected}
              aria-label={name}
              className="flex w-14 shrink-0 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "block h-12 w-12 rounded-full bg-gradient-to-br from-amber-200 via-rose-300 to-orange-400",
                  selected ? "ring-2 ring-white ring-offset-2 ring-offset-black" : "opacity-80",
                )}
                style={{ filter: filter.css === "none" ? undefined : filter.css }}
              />
              <span className={cn("max-w-full truncate text-[10px]", selected ? "font-semibold text-white" : "text-white/70")}>
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
