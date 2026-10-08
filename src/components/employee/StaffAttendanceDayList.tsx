"use client";

import { useTranslations } from "next-intl";
import { AttendanceRecord } from "@/lib/api";
import { Card } from "@/components/ui";
import { useClientPagedList } from "@/lib/use-client-paged-list";
import { cn } from "@/lib/utils";
import { STAFF_ATTENDANCE_LIST_PAGE_SIZE } from "@/components/employee/staff-list-constants";
import { ListPageArrows } from "@/components/employee/ListPageArrows";

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatHours(h?: number | null) {
  if (h == null) return "00:00 Hrs";
  const mins = Math.round(h * 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} Hrs`;
}

function rowLabel(workDate: string) {
  const d = new Date(workDate + "T12:00:00");
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const dow = d.toLocaleDateString("en-IN", { weekday: "short" });
  return `${day} | ${dow}`;
}

type Props = {
  days: AttendanceRecord[];
  isLoading?: boolean;
  /** When set, only show this many rows with no footer (home preview). */
  previewLimit?: number;
  sectionTitle?: boolean;
};

export function StaffAttendanceDayList({ days, isLoading, previewLimit, sectionTitle = true }: Props) {
  const t = useTranslations("employee.attendance");
  const pageSize = previewLimit ?? STAFF_ATTENDANCE_LIST_PAGE_SIZE;
  const pager = useClientPagedList(days, pageSize);
  const rows = previewLimit != null ? days.slice(0, previewLimit) : pager.pageItems;

  return (
    <div className="min-w-0 space-y-2">
      {sectionTitle && (
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{t("dailyLogTitle")}</p>
      )}
      <Card className="overflow-hidden p-0">
        {isLoading && <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loading")}</p>}
        {!isLoading && days.length === 0 && (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{t("dailyLogEmpty")}</p>
        )}
        {!isLoading && days.length > 0 && (
          <>
            <div className="divide-y divide-[var(--border)]">
              {rows.map((record) => (
                <div key={record.workDate} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-[88px] text-xs font-semibold text-[var(--text-secondary)]">
                    {rowLabel(record.workDate)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        record.status === "ABSENT" ? "text-amber-700" : "text-[var(--text-primary)]",
                      )}
                    >
                      {record.status === "ABSENT"
                        ? t("absent")
                        : record.exitTime
                          ? t("presentCompleted")
                          : t("presentOpen")}
                    </p>
                    {record.entryTime && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {formatTime(record.entryTime)}
                        {record.exitTime ? ` - ${formatTime(record.exitTime)}` : ""}
                      </p>
                    )}
                    {record.hoursWorked != null && record.status !== "ABSENT" && (
                      <p className="text-[10px] font-medium text-[var(--text-tertiary)]">{formatHours(record.hoursWorked)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!previewLimit && pager.showPager && (
              <ListPageArrows
                page={pager.page}
                totalPages={pager.totalPages}
                hasPrev={pager.hasPrev}
                hasNext={pager.hasNext}
                onPrev={pager.goPrev}
                onNext={pager.goNext}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
