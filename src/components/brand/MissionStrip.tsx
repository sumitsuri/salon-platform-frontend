"use client";

import { cn } from "@/lib/utils";

/** @deprecated Mission strips removed from post-login UX — kept as no-op for safe rollback. */
export function MissionStrip({
  className,
  variant: _variant,
}: {
  className?: string;
  variant?: "subtle" | "accent";
}) {
  return null;
}
