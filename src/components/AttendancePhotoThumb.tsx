"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { fetchAttendancePhotoBlob } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  recordId: string;
  type?: "entry" | "exit";
  className?: string;
  alt?: string;
}

export function AttendancePhotoThumb({ recordId, type = "entry", className, alt = "Attendance photo" }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    fetchAttendancePhotoBlob(recordId, type)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [recordId, type]);

  if (failed) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center",
          className
        )}
      >
        <Camera className="w-4 h-4 text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] animate-pulse",
          className
        )}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("rounded-lg border border-[var(--border)] object-cover", className)} />
  );
}
