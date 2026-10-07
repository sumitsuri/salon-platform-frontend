"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Fingerprint, LogIn, LogOut } from "lucide-react";
import { btnPrimarySm } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
  todayStatus: string;
  timeLine?: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
  shiftComplete?: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
};

export function StaffTodayPunchBar({
  todayStatus,
  timeLine,
  canCheckIn,
  canCheckOut,
  shiftComplete,
  onCheckIn,
  onCheckOut,
}: Props) {
  const t = useTranslations("staff.home");

  const state = canCheckIn ? "idle" : canCheckOut ? "active" : shiftComplete ? "done" : "idle";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-sm min-w-0",
        state === "active" && "border-[var(--border-brand)]/50",
      )}
    >
      <span
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]",
          state === "active" && "text-[var(--brand-text)]",
        )}
        aria-hidden
      >
        <Fingerprint className="h-5 w-5" />
        <span
          className={cn(
            "absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)]",
            state === "idle" && "bg-amber-400",
            state === "active" && "bg-emerald-500",
            state === "done" && "bg-[var(--text-tertiary)]",
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">{todayStatus}</p>
        {timeLine ? (
          <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate">{timeLine}</p>
        ) : canCheckIn ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">{t("punchHintCheckIn")}</p>
        ) : canCheckOut ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">{t("punchHintCheckOut")}</p>
        ) : shiftComplete ? (
          <Link href="/staff/time" className="text-[11px] font-semibold text-[var(--brand-text)] hover:underline">
            {t("viewAttendanceLog")}
          </Link>
        ) : null}
      </div>

      {canCheckIn && (
        <button type="button" className={cn(btnPrimarySm, "shrink-0")} onClick={onCheckIn}>
          <LogIn className="h-3.5 w-3.5" />
          {t("actionCheckIn")}
        </button>
      )}
      {canCheckOut && (
        <button type="button" className={cn(btnPrimarySm, "shrink-0")} onClick={onCheckOut}>
          <LogOut className="h-3.5 w-3.5" />
          {t("actionCheckOut")}
        </button>
      )}
    </div>
  );
}
