"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StaffAvailabilityColumn, StaffTimeBlock } from "@/lib/api";

export type OnlineAppointmentRow = StaffTimeBlock & {
  staffId: string;
  staffName: string;
};

export function collectOnlineAppointments(staff: StaffAvailabilityColumn[] | undefined): OnlineAppointmentRow[] {
  if (!staff) return [];
  const rows: OnlineAppointmentRow[] = [];
  for (const col of staff) {
    for (const block of col.blocks) {
      if (isOnlineAppointment(block)) {
        rows.push({
          ...block,
          staffId: col.staffId,
          staffName: col.staffName,
        });
      }
    }
  }
  return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Matches floor schedule: CONFIRMED web slots + checked-in online visits. */
function isOnlineAppointment(block: StaffTimeBlock): boolean {
  if (block.status === "CONFIRMED") {
    // All CONFIRMED blocks on the floor board are scheduled online appointments.
    return true;
  }
  if (block.status === "IN_PROGRESS" && block.source === "ONLINE") {
    return true;
  }
  return false;
}

function formatClock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "—";
  }
}

export function OnlineAppointmentsList({
  appointments,
  onSelect,
}: {
  appointments: OnlineAppointmentRow[];
  onSelect: (row: OnlineAppointmentRow) => void;
}) {
  const t = useTranslations("manager.schedule");

  return (
    <section className="rounded-2xl border border-sky-200/80 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20">
      <div className="flex items-start gap-2 border-b border-sky-200/60 px-3 py-3 dark:border-sky-900/30">
        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">{t("onlineAppointmentsTitle")}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{t("onlineAppointmentsSubtitle")}</p>
        </div>
        {appointments.length > 0 ? (
          <span className="ml-auto shrink-0 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
            {appointments.length}
          </span>
        ) : null}
      </div>

      {appointments.length === 0 ? (
        <p className="px-3 py-4 text-sm text-[var(--text-secondary)]">{t("onlineAppointmentsEmpty")}</p>
      ) : (
        <ul className="divide-y divide-sky-200/50 dark:divide-sky-900/30">
          {appointments.map((row) => (
            <li key={`${row.bookingId}-${row.startAt}`}>
              <button
                type="button"
                onClick={() => onSelect(row)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-sky-100/60 active:bg-sky-100 dark:hover:bg-sky-950/40 touch-manipulation"
              >
                <div className="shrink-0 text-center min-w-[4.5rem]">
                  <p className="text-sm font-bold tabular-nums text-sky-800 dark:text-sky-300">
                    {formatClock(row.startAt)}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                    {formatClock(row.endAt)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{row.customerName}</p>
                    <span className="rounded-md bg-sky-600/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                      {t("onlineAppointmentsBadge")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] truncate">
                    {row.staffName} · {row.services.join(", ")}
                  </p>
                  {row.customerPhone ? (
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{row.customerPhone}</p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
