"use client";

import { useEffect, useRef, type RefObject } from "react";
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
  mirrored = true,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  previewUrl: string | null;
  filterId: SelfieFilterId;
  showGuide: boolean;
  /** Front-camera preview is mirrored. An uploaded file is shown as saved. */
  mirrored?: boolean;
}) {
  const filter = selfieFilterCss(filterId);
  return (
    <div className="absolute inset-0 bg-black">
      <div className="absolute inset-0" style={mirrored ? { transform: "scaleX(-1)" } : undefined}>
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
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-24">
          <div className="aspect-[3/4] w-[68%] max-w-[15.5rem] rounded-[999px] border-2 border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" />
        </div>
      )}
    </div>
  );
}

/** Instagram-style look tray: one name, round previews, the selected look is larger and centered. */
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
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div className="w-full" role="group" aria-label={label}>
      <p className="mb-2 text-center text-sm font-semibold text-white drop-shadow">{nameFor(value)}</p>
      <div className="flex w-full items-center gap-4 overflow-x-auto px-[38%] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SELFIE_FILTERS.map((filter) => {
          const selected = filter.id === value;
          const name = nameFor(filter.id);
          return (
            <button
              key={filter.id}
              ref={selected ? selectedRef : undefined}
              type="button"
              onClick={() => onChange(filter.id)}
              aria-pressed={selected}
              aria-label={name}
              className="flex shrink-0 items-center justify-center"
            >
              <span
                className={cn(
                  "block rounded-full bg-gradient-to-br from-amber-100 via-rose-300 to-orange-500 shadow-md transition-transform",
                  selected ? "h-14 w-14 ring-2 ring-white" : "h-10 w-10 opacity-80",
                )}
                style={{ filter: filter.css === "none" ? undefined : filter.css }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
