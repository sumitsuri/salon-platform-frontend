"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  RefreshCw,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, type StaffAvailabilityColumn, type StaffTimeBlock } from "@/lib/api";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useAuthStore } from "@/lib/auth-store";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  btnPrimary,
  btnSecondary,
  EmptyState,
  MobileStatGrid,
  ResponsiveTableShell,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

type SelectedVisit = {
  block: StaffTimeBlock;
  staffId: string;
  staffName: string;
};

type BoardScale = {
  pxPerMin: number;
  staffColW: number;
  rowH: number;
};

function useBoardScale(): BoardScale {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const sync = () => setWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  if (width < 380) return { pxPerMin: 0.82, staffColW: 108, rowH: 78 };
  if (width < 640) return { pxPerMin: 0.95, staffColW: 124, rowH: 82 };
  if (width < 1024) return { pxPerMin: 1.15, staffColW: 148, rowH: 86 };
  return { pxPerMin: 1.35, staffColW: 168, rowH: 88 };
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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

function minutesFromOpen(iso: string, openMinutes: number, date: string) {
  const t = new Date(iso).getTime();
  const open = new Date(
    `${date}T${String(Math.floor(openMinutes / 60)).padStart(2, "0")}:${String(openMinutes % 60).padStart(2, "0")}:00+05:30`
  ).getTime();
  return Math.max(0, Math.round((t - open) / 60000));
}

function occupancyTone(occ: string) {
  if (occ === "FREE") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-500/30";
  if (occ === "OVERDUE") return "bg-rose-500/15 text-rose-800 dark:text-rose-300 ring-rose-500/30";
  return "bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-500/30";
}

function blockTone(block: StaffTimeBlock) {
  if (block.overdue || block.status === "IN_PROGRESS") {
    return block.overdue
      ? "bg-rose-500/90 text-white border-rose-700"
      : "bg-[color-mix(in_srgb,var(--brand)_88%,black)] text-white border-[color-mix(in_srgb,var(--brand)_60%,black)]";
  }
  if (block.status === "READY_FOR_BILLING") {
    return "bg-amber-500 text-white border-amber-700";
  }
  return "bg-stone-500/80 text-white border-stone-700";
}

function StaffRow({
  column,
  openMin,
  totalMin,
  date,
  isToday,
  scale,
  t,
  onSelect,
}: {
  column: StaffAvailabilityColumn;
  openMin: number;
  totalMin: number;
  date: string;
  isToday: boolean;
  scale: BoardScale;
  t: ReturnType<typeof useTranslations>;
  onSelect: (block: StaffTimeBlock, staff: StaffAvailabilityColumn) => void;
}) {
  const { pxPerMin, staffColW, rowH } = scale;
  const trackW = Math.max(totalMin * pxPerMin, 360);
  const hourGap = Math.max(48, 60 * pxPerMin);

  return (
    <div className="flex border-b border-[var(--border)] last:border-b-0" style={{ minHeight: rowH }}>
      <div
        className="sticky left-0 z-20 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-2 sm:px-3 py-2 flex flex-col justify-center gap-0.5 sm:gap-1 shadow-[4px_0_12px_-8px_rgba(0,0,0,0.18)]"
        style={{ width: staffColW }}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate leading-tight">
              {column.staffName}
            </p>
            {column.skills && (
              <p className="text-[9px] sm:text-[10px] text-[var(--text-secondary)] truncate mt-0.5 hidden xs:block sm:block">
                {column.skills}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 text-[8px] sm:text-[9px] font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded-md ring-1 ${occupancyTone(column.occupancy)}`}
          >
            {column.occupancy === "FREE"
              ? t("free")
              : column.occupancy === "OVERDUE"
                ? t("overdue")
                : t("busy")}
          </span>
        </div>
        {isToday && column.occupancy !== "FREE" && (
          <p className="text-[9px] sm:text-[10px] text-[var(--text-secondary)] leading-snug line-clamp-2">
            {column.occupancy === "OVERDUE"
              ? t("runningLate")
              : t("freeIn", {
                  mins: column.remainingMinutes ?? 0,
                  time: column.busyUntil ? formatClock(column.busyUntil) : "—",
                })}
          </p>
        )}
        {isToday && column.occupancy === "FREE" && column.freeSlots[0] && (
          <p className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 leading-snug">
            {t("nextGap", { mins: column.freeSlots[0].minutes })}
          </p>
        )}
        <Link
          href={`/manager/walk-in?staffId=${column.staffId}`}
          className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[var(--brand)] hover:underline w-fit touch-manipulation"
        >
          <UserPlus className="w-3 h-3" />
          <span className="truncate">{t("assignVisit")}</span>
        </Link>
      </div>

      <div
        className="relative shrink-0"
        style={{
          width: trackW,
          height: rowH,
          backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(--brand) 5%, transparent), transparent 18%), repeating-linear-gradient(90deg, transparent, transparent ${hourGap - 0.1}px, color-mix(in srgb, var(--border) 75%, transparent) ${hourGap}px)`,
        }}
      >
        {column.blocks.map((block) => {
          const startOff = Math.min(minutesFromOpen(block.startAt, openMin, date), totalMin);
          const endOff = Math.min(
            Math.max(minutesFromOpen(block.endAt, openMin, date), startOff + 15),
            totalMin
          );
          const left = startOff * pxPerMin;
          const width = Math.max((endOff - startOff) * pxPerMin, 48);
          return (
            <button
              type="button"
              key={`${block.bookingId}-${block.startAt}`}
              className={`absolute top-1.5 bottom-1.5 sm:top-2 sm:bottom-2 rounded-lg border px-1.5 sm:px-2 py-1 shadow-md overflow-hidden text-left cursor-pointer transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] touch-manipulation ${blockTone(block)}`}
              style={{ left, width }}
              title={t("clickForDetails")}
              onClick={() => onSelect(block, column)}
            >
              <p className="text-[10px] sm:text-[11px] font-bold truncate leading-tight">{block.customerName}</p>
              <p className="text-[9px] sm:text-[10px] opacity-90 truncate leading-tight mt-0.5">
                {formatClock(block.startAt)} – {formatClock(block.endAt)}
              </p>
              <p className="text-[9px] sm:text-[10px] opacity-85 truncate leading-tight mt-0.5 hidden sm:block">
                {block.services.join(" · ")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VisitDetailsModal({
  selected,
  onClose,
  t,
}: {
  selected: SelectedVisit;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { block, staffName } = selected;
  const open = block.status === "IN_PROGRESS" || block.status === "READY_FOR_BILLING";

  useEffect(() => {
    return lockBodyScroll();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90dvh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)] shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {t("visitDetails")}
            </p>
            <h2 id="visit-detail-title" className="text-lg font-bold text-[var(--text-primary)] truncate">
              {block.customerName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] touch-manipulation"
            aria-label={t("close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1 overscroll-contain">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={block.status} />
            {block.overdue && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/30">
                {t("overdue")}
              </span>
            )}
          </div>

          {block.customerPhone && (
            <p className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Phone className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
              <a href={`tel:${block.customerPhone}`} className="truncate hover:underline">
                {block.customerPhone}
              </a>
            </p>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2.5 space-y-1.5">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-[var(--text-secondary)] shrink-0">{t("stylist")}</span>
              <span className="font-semibold text-[var(--text-primary)] text-right break-words">{staffName}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-[var(--text-secondary)] shrink-0">{t("timeWindow")}</span>
              <span className="font-semibold text-[var(--text-primary)] text-right">
                {formatClock(block.startAt)} – {formatClock(block.endAt)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-[var(--text-secondary)]">{t("estimated")}</span>
              <span className="font-semibold text-[var(--text-primary)]">{block.estimatedMinutes}m</span>
            </div>
            {block.actualMinutes != null && (
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{t("actual")}</span>
                <span className="font-semibold text-[var(--text-primary)]">{block.actualMinutes}m</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
              {t("services")}
            </p>
            <ul className="space-y-1">
              {block.services.map((s) => (
                <li
                  key={s}
                  className="text-sm text-[var(--text-primary)] rounded-lg border border-[var(--border)] px-3 py-2 break-words"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--border)] flex flex-col sm:flex-row gap-2 shrink-0">
          {block.status === "READY_FOR_BILLING" ? (
            <>
              <Link
                href={`/manager/walk-in?bookingId=${block.bookingId}`}
                className={`${btnPrimary} w-full min-h-12 touch-manipulation justify-center`}
                onClick={onClose}
              >
                {t("billNow")}
              </Link>
              <Link
                href={`/manager/walk-in?bookingId=${block.bookingId}&edit=1`}
                className={`${btnSecondary} w-full min-h-12 touch-manipulation justify-center`}
                onClick={onClose}
              >
                {t("openVisit")}
              </Link>
            </>
          ) : open ? (
            <Link
              href={`/manager/walk-in?bookingId=${block.bookingId}`}
              className={`${btnPrimary} w-full min-h-12 touch-manipulation justify-center`}
              onClick={onClose}
            >
              {t("openVisit")}
            </Link>
          ) : (
            <Link
              href="/manager/walk-in?tab=history"
              className={`${btnPrimary} w-full min-h-12 touch-manipulation justify-center`}
              onClick={onClose}
            >
              {t("viewInBookings")}
            </Link>
          )}
          <button
            type="button"
            className={`${btnSecondary} w-full min-h-12 touch-manipulation justify-center`}
            onClick={onClose}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerSchedulePage() {
  const t = useTranslations("manager.schedule");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const [date, setDate] = useState(todayIso);
  const [selected, setSelected] = useState<SelectedVisit | null>(null);
  const scale = useBoardScale();

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["branch-availability", branchId, date],
    queryFn: () => api.getBranchAvailability(branchId, date),
    enabled: !!branchId,
    refetchInterval: date === todayIso() ? 30_000 : false,
  });

  const openMin = parseHm(data?.openTime || "09:00");
  const closeMin = parseHm(data?.closeTime || "21:00");
  const isToday = date === todayIso();

  const totalMin = useMemo(() => {
    let end = closeMin;
    if (data?.staff) {
      for (const s of data.staff) {
        for (const b of s.blocks) {
          end = Math.max(end, openMin + minutesFromOpen(b.endAt, openMin, date));
        }
      }
    }
    if (isToday && data?.now) {
      end = Math.max(end, openMin + minutesFromOpen(data.now, openMin, date) + 30);
    }
    end = Math.min(end, 24 * 60 + 60);
    return Math.max(end - openMin, 60);
  }, [closeMin, openMin, data, date, isToday]);

  const trackW = Math.max(totalMin * scale.pxPerMin, 360);
  const axisEndMin = openMin + totalMin;

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    for (let m = openMin; m <= axisEndMin; m += 60) marks.push(m);
    return marks;
  }, [openMin, axisEndMin]);

  const nowOffset = useMemo(() => {
    if (!isToday || !data?.now) return null;
    return minutesFromOpen(data.now, openMin, date);
  }, [isToday, data?.now, openMin, date]);

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link href="/manager/walk-in" className={`${btnPrimary} w-full sm:w-auto touch-manipulation`}>
            <UserPlus className="w-4 h-4" />
            {t("newWalkIn")}
          </Link>
        }
      />

      <MissionStrip variant="accent" />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            className={`${btnSecondary} px-2.5 touch-manipulation`}
            aria-label={t("prevDay")}
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <label className="inline-flex items-center gap-1.5 sm:gap-2 text-sm font-semibold text-[var(--text-primary)] px-1 sm:px-2 min-w-0">
            <CalendarDays className="w-4 h-4 text-[var(--brand)] shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-0 p-0 text-sm font-semibold focus:outline-none max-w-[9.5rem] sm:max-w-none"
            />
          </label>
          <button
            type="button"
            className={`${btnSecondary} px-2.5 touch-manipulation`}
            aria-label={t("nextDay")}
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button type="button" className={`${btnSecondary} touch-manipulation`} onClick={() => setDate(todayIso())}>
              {t("today")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] sm:text-xs text-[var(--text-secondary)]">
          <p className="truncate min-w-0">
            {data ? t("hours", { open: data.openTime, close: data.closeTime }) : "—"}
            {dataUpdatedAt
              ? ` · ${t("updated", {
                  time: new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}`
              : ""}
          </p>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] touch-manipulation disabled:opacity-50"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("refresh")}
            title={t("refresh")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="nav-tile-grid gap-2 sm:gap-3">
        <StatCard label={t("freeNow")} value={data?.freeStaffCount ?? "—"} icon={Users} accent="emerald" />
        <StatCard label={t("busyNow")} value={data?.busyStaffCount ?? "—"} icon={Clock3} accent="amber" />
        <StatCard
          label={t("avgVisit")}
          value={data?.metrics?.avgVisitMinutes != null ? `${Math.round(data.metrics.avgVisitMinutes)}m` : "—"}
          icon={Clock3}
          accent="brand"
        />
        <StatCard
          label={t("medianVisit")}
          value={
            data?.metrics?.medianVisitMinutes != null ? `${Math.round(data.metrics.medianVisitMinutes)}m` : "—"
          }
          icon={CalendarDays}
          accent="violet"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--text-secondary)] py-10 text-center">{tCommon("loading")}</p>
      ) : !data || data.staff.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <div className="space-y-2 min-w-0">
          <p className="text-[11px] text-[var(--text-secondary)] sm:hidden px-0.5">{t("scrollHint")}</p>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto overscroll-x-contain touch-pan-x max-w-full min-w-0 [-webkit-overflow-scrolling:touch]">
              <div className="inline-block align-top" style={{ minWidth: scale.staffColW + trackW }}>
                <div className="flex border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_6%,var(--surface))] sticky top-0 z-30">
                  <div
                    className="sticky left-0 z-40 shrink-0 border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_6%,var(--surface))] px-2 sm:px-3 py-2 flex items-end"
                    style={{ width: scale.staffColW }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      {t("colStaff")}
                    </span>
                  </div>
                  <div className="relative shrink-0" style={{ width: trackW, height: 36 }}>
                    {hourMarks.map((m) => {
                      const labelH = Math.floor(m / 60) % 24;
                      const labelM = m % 60;
                      const left = (m - openMin) * scale.pxPerMin;
                      return (
                        <div key={m} className="absolute top-0 bottom-0" style={{ left }}>
                          <span className="absolute left-1 bottom-1.5 text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                            {`${String(labelH).padStart(2, "0")}:${String(labelM).padStart(2, "0")}`}
                          </span>
                        </div>
                      );
                    })}
                    {nowOffset != null && nowOffset >= 0 && nowOffset <= totalMin && (
                      <div
                        className="absolute top-0 bottom-0 z-10 pointer-events-none"
                        style={{ left: nowOffset * scale.pxPerMin }}
                      >
                        <div className="w-0.5 h-full bg-rose-500" />
                        <span className="absolute top-0 left-1 text-[9px] font-bold text-rose-600 bg-[var(--surface)] px-1 rounded shadow-sm">
                          {t("now")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  {nowOffset != null && nowOffset >= 0 && nowOffset <= totalMin && (
                    <div
                      className="absolute top-0 bottom-0 z-10 pointer-events-none"
                      style={{ left: scale.staffColW + nowOffset * scale.pxPerMin }}
                    >
                      <div className="w-0.5 h-full bg-rose-500/70" />
                    </div>
                  )}
                  {data.staff.map((col) => (
                    <StaffRow
                      key={col.staffId}
                      column={col}
                      openMin={openMin}
                      totalMin={totalMin}
                      date={date}
                      isToday={isToday}
                      scale={scale}
                      t={t}
                      onSelect={(block, staff) =>
                        setSelected({
                          block,
                          staffId: staff.staffId,
                          staffName: staff.staffName,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && <VisitDetailsModal selected={selected} onClose={() => setSelected(null)} t={t} />}

      {data?.metrics?.byStaffService && data.metrics.byStaffService.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden min-w-0">
          <div className="px-3 sm:px-4 py-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">{t("timingTitle")}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {t("timingSubtitle", { days: 30, count: data.metrics.sampleVisitCount })}
            </p>
          </div>
          <ResponsiveTableShell
            mobile={
              <div className="divide-y divide-[var(--border)]">
                {data.metrics.byStaffService.map((row) => (
                  <div key={`${row.staffId}-${row.serviceId}`} className="p-4 space-y-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--text-primary)]">{row.staffName}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{row.serviceName}</p>
                    </div>
                    <MobileStatGrid
                      columns={3}
                      items={[
                        { label: t("colSamples"), value: row.sampleCount },
                        { label: t("colEst"), value: `${Math.round(row.avgEstimatedMinutes)}m` },
                        {
                          label: t("colActual"),
                          value:
                            row.avgActualMinutes != null ? `${Math.round(row.avgActualMinutes)}m` : "—",
                          accentClass: "text-[var(--brand-text)]",
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="px-3 sm:px-4 py-2.5 font-semibold">{t("colStaff")}</th>
                  <th className="px-3 sm:px-4 py-2.5 font-semibold">{t("colService")}</th>
                  <th className="px-3 sm:px-4 py-2.5 font-semibold">{t("colSamples")}</th>
                  <th className="px-3 sm:px-4 py-2.5 font-semibold">{t("colEst")}</th>
                  <th className="px-3 sm:px-4 py-2.5 font-semibold">{t("colActual")}</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.byStaffService.map((row) => (
                  <tr key={`${row.staffId}-${row.serviceId}`} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 sm:px-4 py-2.5 font-medium text-[var(--text-primary)]">{row.staffName}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[var(--text-secondary)]">{row.serviceName}</td>
                    <td className="px-3 sm:px-4 py-2.5">{row.sampleCount}</td>
                    <td className="px-3 sm:px-4 py-2.5">{Math.round(row.avgEstimatedMinutes)}m</td>
                    <td className="px-3 sm:px-4 py-2.5 font-semibold">
                      {row.avgActualMinutes != null ? `${Math.round(row.avgActualMinutes)}m` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableShell>
        </section>
      )}
    </div>
  );
}
