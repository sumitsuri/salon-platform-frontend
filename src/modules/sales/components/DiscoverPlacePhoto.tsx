"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { salesApi } from "@/modules/sales/api/salesApi";

type DiscoverPlacePhotoProps = {
  photoRef?: string;
  alt: string;
  className?: string;
};

export function DiscoverPlacePhoto({ photoRef, alt, className = "" }: DiscoverPlacePhotoProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!photoRef) {
      setFailed(true);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setSrc(null);

    salesApi
      .fetchDiscoverPlacePhoto(photoRef, 120)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoRef]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[var(--surface-muted)] to-[var(--border)] text-[var(--ink-muted)] ${className}`}
      aria-hidden={!photoRef}
    >
      <ImageIcon className="h-6 w-6 opacity-50" />
    </div>
  );
}
