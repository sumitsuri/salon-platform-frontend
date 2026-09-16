"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type TagSlot = "walkin" | "membership" | "package";

export function ManagerHomePromoFeatureTags({
  labels,
  slot,
}: {
  labels: readonly string[];
  slot: TagSlot;
}) {
  const line = labels.filter(Boolean).join(" · ");
  if (!line) return null;
  return (
    <p
      className={cn("manager-home-promo-compact-tags-line", `manager-home-promo-compact-tags-line--${slot}`)}
    >
      {line}
    </p>
  );
}

export function ManagerHomePromoActionPill({
  slot,
  motion,
  icon: Icon,
  label,
}: {
  slot: TagSlot;
  motion: "walkin" | "claim" | "earn";
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span
      className={cn(
        "manager-home-promo-compact-pill",
        motion === "walkin" && "manager-home-promo-compact-pill--walkin",
        motion === "claim" && "manager-home-promo-compact-pill--claim",
        motion === "earn" && "manager-home-promo-compact-pill--earn",
        slot !== "walkin" && `manager-home-promo-compact-pill--${slot}`
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="manager-home-promo-compact-pill-label">{label}</span>
      <span className="manager-home-promo-compact-pill-chevrons" aria-hidden>
        &gt;&gt;
      </span>
    </span>
  );
}
