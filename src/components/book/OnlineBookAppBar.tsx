"use client";

import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { bookPath } from "@/lib/book-api";

type BookStep = "service" | "stylist" | "time" | "confirm" | "done";

const STEP_TITLES: Record<BookStep, string> = {
  service: "Choose services",
  stylist: "Choose professional",
  time: "Pick a time",
  confirm: "Confirm booking",
  done: "Booking confirmed",
};

const STEP_LABELS: Record<Exclude<BookStep, "done">, string> = {
  service: "Services",
  stylist: "Professional",
  time: "Time",
  confirm: "Confirm",
};

export function OnlineBookAppBar({
  step,
  tenantSlug,
  onBack,
}: {
  step: BookStep;
  tenantSlug: string;
  onBack?: () => void;
}) {
  const showBack = step !== "service" && step !== "done" && onBack;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-black/[0.06] bg-white/95 px-3 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-5 lg:px-8">
      <div className="flex w-10 shrink-0 justify-start">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1c1917] hover:bg-black/[0.05] touch-manipulation"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link
            href={bookPath(tenantSlug)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1c1917] hover:bg-black/[0.05] touch-manipulation"
            aria-label="All branches"
          >
            <Home className="h-5 w-5" />
          </Link>
        )}
      </div>
      <h1 className="flex-1 truncate text-center text-[15px] font-semibold text-[#1c1917] md:text-base">
        {STEP_TITLES[step]}
      </h1>
      <div className="w-10 shrink-0" aria-hidden />
    </header>
  );
}

export function OnlineBookStepBar({ step }: { step: BookStep }) {
  const steps: Exclude<BookStep, "done">[] = ["service", "stylist", "time", "confirm"];
  const idx = step === "done" ? steps.length : steps.indexOf(step);

  return (
    <div className="border-b border-black/[0.04] bg-white px-4 py-3 md:px-5 lg:px-8">
      <div className="flex items-center gap-1.5 md:gap-2">
        {steps.map((s, i) => {
          const done = i < idx;
          const active = s === step;
          return (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`h-1 w-full rounded-full transition-colors ${
                  done || active ? "bg-[var(--book-accent,#6366f1)]" : "bg-[#e5e5ea]"
                }`}
              />
              <span
                className={`hidden text-[10px] font-semibold uppercase tracking-wide md:block ${
                  active ? "text-[var(--book-accent,#6366f1)]" : done ? "text-[#636366]" : "text-[#8e8e93]"
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
