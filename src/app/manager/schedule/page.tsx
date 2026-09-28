"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Globe,
  Phone,
  Plus,
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
  StatusBadge,
  btnPrimary,
  btnSecondary,
  EmptyState,
  MobileStatGrid,
  ResponsiveTableShell,
} from "@/components/ui";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { OnlineBookingPanel } from "@/components/book/OnlineBookingPanel";
import {
  OnlineAppointmentsList,
  collectOnlineAppointments,
  isOnlineAppointment,
} from "@/components/book/OnlineAppointmentsList";
import { AddAppointmentSheet } from "@/components/manager/AddAppointmentSheet";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { useUrlQueryParam } from "@/lib/use-url-query-param";
import { usePersistentState } from "@/lib/use-persistent-state";
import { useDetailBreadcrumbs } from "@/lib/use-detail-breadcrumbs";
import { managerSchedulePath } from "@/lib/navigation-scope";

type SelectedVisit = {
  block: StaffTimeBlock;
  staffId: string;
  staffName: string;
};

type CalendarScale = {
  pxPerMin: number;
  rulerW: number;
  colW: number;
  headerH: number;
};

function useCalendarScale(): CalendarScale {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const sync = () => setWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  if (width < 380) return { pxPerMin: 1.1, rulerW: 44, colW: 132, headerH: 52 };
  if (width < 640) return { pxPerMin: 1.2, rulerW: 48, colW: 152, headerH: 56 };
  if (width < 1024) return { pxPerMin: 1.3, rulerW: 56, colW: 180, headerH: 60 };
  return { pxPerMin: 1.4, rulerW: 64, colW: 212, headerH: 64 };
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

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesFromOpen(iso: string, openMinutes: number, date: string) {
  const t = new Date(iso).getTime();
  const open = new Date(
    `${date}T${String(Math.floor(openMinutes / 60)).padStart(2, "0")}:${String(openMinutes % 60).padStart(2, "0")}:00+05:30`
  ).getTime();
  return Math.max(0, Math.round((t - open) / 60000));
}

function formatHourLabel(minutesOfDay: number) {
  const hours = Math.floor(minutesOfDay / 60) % 24;
  const mins = minutesOfDay % 60;
  const ampm = hours < 12 ? "AM" : "PM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return mins === 0 ? `${h12} ${ampm}` : `${h12}:${String(mins).padStart(2, "0")} ${ampm}`;
}

function occupancyTone(occ: string) {
  if (occ === "FREE") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-500/30";
  if (occ === "OVERDUE") return "bg-rose-500/15 text-rose-800 dark:text-rose-300 ring-rose-500/30";
  return "bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-500/30";
}

function blockTone(block: StaffTimeBlock) {
  if (block.overdue) return "bg-rose-500/90 text-white border-rose-700";
  if (block.status === "CONFIRMED") return "bg-sky-600/90 text-white border-sky-800";
  if (block.status === "IN_PROGRESS") {
    return "bg-[color-mix(in_srgb,var(--brand)_88%,black)] text-white border-[color-mix(in_srgb,var(--brand)_60%,black)]";
  }
  if (block.status === "READY_FOR_BILLING") return "bg-amber-500 text-white border-amber-700";
  return "bg-stone-500/80 text-white border-stone-700";
}

function StaffCalendarGrid({
  staff,
  openMin,
  totalMin,
  date,
  scale,
  nowOffset,
  t,
  onSelect,
  onSlotClick,
}: {
  staff: StaffAvailabilityColumn[];
  openMin: number;
  totalMin: number;
  date: string;
  scale: CalendarScale;
  nowOffset: number | null;
  t: ReturnType<typeof useTranslations>;
  onSelect: (block: StaffTimeBlock, staff: StaffAvailabilityColumn) => void;
  onSlotClick: (staff: StaffAvailabilityColumn, minutesFromOpen: number) => void;
}) {
  const { pxPerMin, rulerW, colW, headerH } = scale;
  const bodyH = totalMin * pxPerMin;
  const hourGapPx = 60 * pxPerMin;

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    for (let m = openMin; m <= openMin + totalMin; m += 60) marks.push(m);
    return marks;
  }, [openMin, totalMin]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="max-h-[72vh] overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex" style={{ minWidth: rulerW + staff.length * colW }}>
          <div className="sticky left-0 z-30 shrink-0 bg-[var(--surface)]" style={{ width: rulerW }}>
            <div
              className="sticky top-0 z-10 border-b border-r border-[var(--border)] bg-[var(--surface)]"
              style={{ height: headerH }}
            />
            <div className="relative border-r border-[var(--border)]" style={{ height: bodyH }}>
              {hourMarks.map((m) => (
                <span
                  key={m}
                  className="absolute right-1.5 -translate-y-1/2 text-[9px] sm:text-[10px] font-semibold text-[var(--text-secondary)] whitespace-nowrap"
                  style={{ top: (m - openMin) * pxPerMin }}
                >
                  {formatHourLabel(m)}
                </span>
              ))}
            </div>
          </div>

          {staff.map((col) => (
            <div key={col.staffId} className="shrink-0 border-r border-[var(--border)] last:border-r-0" style={{ width: colW }}>
              <div
                className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_6%,var(--surface))] px-2 sm:px-2.5 py-1.5 flex flex-col justify-center gap-1"
                style={{ height: headerH }}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-[11px] sm:text-xs text-[var(--text-primary)] truncate">
                    {col.staffName}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSlotClick(col, 0)}
                    className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--brand-text)] hover:bg-[var(--brand-light)] touch-manipulation"
                    title={t("addBookingFor", { name: col.staffName })}
                    aria-label={t("addBookingFor", { name: col.staffName })}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span
                  className={`self-start text-[8px] sm:text-[9px] font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded-md ring-1 ${occupancyTone(col.occupancy)}`}
                >
                  {col.occupancy === "FREE" ? t("free") : col.occupancy === "OVERDUE" ? t("overdue") : t("busy")}
                </span>
              </div>

              <div
                className="relative cursor-pointer touch-manipulation"
                style={{
                  height: bodyH,
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${hourGapPx - 1}px, color-mix(in srgb, var(--border) 70%, transparent) ${hourGapPx}px)`,
                }}
                title={t("clickToAdd")}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = Math.round((e.clientY - rect.top) / pxPerMin / 15) * 15;
                  onSlotClick(col, Math.max(0, Math.min(minutes, totalMin)));
                }}
              >
                {nowOffset != null && nowOffset >= 0 && nowOffset <= totalMin && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none border-t-2 border-rose-500"
                    style={{ top: nowOffset * pxPerMin }}
                  />
                )}
                {col.blocks.map((block) => {
                  const startOff = Math.min(minutesFromOpen(block.startAt, openMin, date), totalMin);
                  const endOff = Math.min(
                    Math.max(minutesFromOpen(block.endAt, openMin, date), startOff + 15),
                    totalMin
                  );
                  const top = startOff * pxPerMin;
                  const height = Math.max((endOff - startOff) * pxPerMin, 26);
                  return (
                    <button
                      type="button"
                      key={block.bookingId}
                      className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-1 shadow-md overflow-hidden text-left transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] touch-manipulation ${blockTone(block)}`}
                      style={{ top, height }}
                      title={t("clickForDetails")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(block, col);
                      }}
                    >
                      <p className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold leading-tight">
                        {isOnlineAppointment(block) && (
                          <Globe className="h-2.5 w-2.5 shrink-0" aria-label={t("onlineAppointmentsBadge")} />
                        )}
                        <span className="truncate">{block.customerName}</span>
                      </p>
                      <p className="text-[8px] sm:text-[9px] opacity-90 truncate leading-tight mt-0.5">
                        {formatClock(block.startAt)} – {formatClock(block.endAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisitDetailsModal({
  selected,
  onClose,
  onCheckedIn,
  t,
}: {
  selected: SelectedVisit;
  onClose: () => void;
  onCheckedIn: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { block, staffName } = selected;
  const open = block.status === "IN_PROGRESS" || block.status === "READY_FOR_BILLING";
  const isConfirmed = block.status === "CONFIRMED";
  const [checkInError, setCheckInError] = useState("");

  const checkInMutation = useMutation({
    mutationFn: () => api.checkInBooking(block.bookingId),
    onSuccess: () => {
      setCheckInError("");
      onCheckedIn();
      onClose();
    },
    onError: (e: Error) => setCheckInError(e.message),
  });

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
            {isOnlineAppointment(block) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-sky-600/15 text-sky-800 dark:text-sky-300 ring-1 ring-sky-500/30">
                <Globe className="h-3 w-3" aria-hidden />
                {t("onlineAppointmentsBadge")}
              </span>
            )}
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
          {checkInError ? <p className="text-xs text-red-600 w-full">{checkInError}</p> : null}
          {isConfirmed ? (
            <button
              type="button"
              className={`${btnPrimary} w-full min-h-12 touch-manipulation justify-center`}
              disabled={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
            >
              {checkInMutation.isPending ? t("checkingIn") : t("checkIn")}
            </button>
          ) : null}
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
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <ManagerSchedulePageContent />
    </Suspense>
  );
}

function ManagerSchedulePageContent() {
  const t = useTranslations("manager.schedule");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const searchParams = useSearchParams();
  const urlDate = searchParams.get("date");
  const [persistedDate, setPersistedDate] = usePersistentState("manager-schedule:date", todayIso);
  const date = urlDate ?? persistedDate;
  const setDate = (value: string | ((prev: string) => string)) => {
    setPersistedDate((prev) => {
      const base = urlDate ?? prev;
      return typeof value === "function" ? value(base) : value;
    });
  };
  const bookingParam = useUrlQueryParam("bookingId");
  const scale = useCalendarScale();
  const [addSheetStaff, setAddSheetStaff] = useState<{ staffId: string; staffName: string } | null>(null);
  const [bookingSettingsOpen, setBookingSettingsOpen] = useState(false);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["branch-availability", branchId, date],
    queryFn: () => api.getBranchAvailability(branchId, date),
    enabled: !!branchId,
    refetchInterval: date === todayIso() ? 30_000 : false,
  });

  const { data: branch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => api.getBranch(branchId),
    enabled: !!branchId,
  });

  const onlineAppointments = useMemo(() => collectOnlineAppointments(data?.staff), [data?.staff]);

  const isToday = date === todayIso();

  const openMin = parseHm(data?.openTime || "09:00");
  const closeMin = parseHm(data?.closeTime || "21:00");

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

  const nowOffset = useMemo(() => {
    if (!isToday || !data?.now) return null;
    return minutesFromOpen(data.now, openMin, date);
  }, [isToday, data?.now, openMin, date]);

  function handleSlotClick(staff: StaffAvailabilityColumn) {
    setAddSheetStaff({ staffId: staff.staffId, staffName: staff.staffName });
  }

  const selected = useMemo((): SelectedVisit | null => {
    if (!bookingParam.value || !data?.staff) return null;
    for (const col of data.staff) {
      const block = col.blocks.find((b) => b.bookingId === bookingParam.value);
      if (block) {
        return { block, staffId: col.staffId, staffName: col.staffName };
      }
    }
    return null;
  }, [bookingParam.value, data?.staff]);

  const detailBreadcrumbs = useMemo(() => {
    if (!bookingParam.isSet) return null;
    return [
      { label: t("title"), href: managerSchedulePath(date), onClick: () => bookingParam.unset() },
      { label: selected?.block.customerName ?? t("visitDetails") },
    ];
  }, [bookingParam, date, selected?.block.customerName, t]);

  useDetailBreadcrumbs(bookingParam.isSet, detailBreadcrumbs);

  function openVisit(block: StaffTimeBlock, staff: StaffAvailabilityColumn) {
    bookingParam.set(block.bookingId);
  }

  function closeVisit() {
    bookingParam.unset();
  }

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

      {branch ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <button
            type="button"
            onClick={() => setBookingSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 sm:px-4 py-2.5 text-left touch-manipulation"
          >
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
              <Globe className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" aria-hidden />
              {t("onlineBookingTitle")}
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                  branch.onlineBookingEffective
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    : "bg-stone-500/15 text-stone-700 dark:text-stone-300"
                }`}
              >
                {branch.onlineBookingEffective ? "On" : "Off"}
              </span>
            </span>
            {bookingSettingsOpen ? (
              <ChevronUp className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
            )}
          </button>
          {bookingSettingsOpen && (
            <div className="border-t border-[var(--border)] p-3 sm:p-4">
              <OnlineBookingPanel branch={branch} compact />
            </div>
          )}
        </div>
      ) : null}

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

      <CompactStatsStrip
        loading={isLoading}
        testId="manager-schedule-summary-strip"
        items={[
          {
            id: "free",
            label: t("freeNow"),
            value: String(data?.freeStaffCount ?? "—"),
            icon: Users,
            accent: "emerald",
          },
          {
            id: "busy",
            label: t("busyNow"),
            value: String(data?.busyStaffCount ?? "—"),
            icon: Clock3,
            accent: "amber",
          },
          {
            id: "avg",
            label: t("avgVisit"),
            value: data?.metrics?.avgVisitMinutes != null ? `${Math.round(data.metrics.avgVisitMinutes)}m` : "—",
            icon: Clock3,
            accent: "violet",
          },
          {
            id: "median",
            label: t("medianVisit"),
            value:
              data?.metrics?.medianVisitMinutes != null
                ? `${Math.round(data.metrics.medianVisitMinutes)}m`
                : "—",
            icon: CalendarDays,
            accent: "sky",
          },
        ]}
      />

      {!isLoading && data ? (
        <OnlineAppointmentsList
          appointments={onlineAppointments}
          onSelect={(row) => bookingParam.set(row.bookingId)}
        />
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--text-secondary)] py-10 text-center">{tCommon("loading")}</p>
      ) : !data || data.staff.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <div className="space-y-2 min-w-0">
          <p className="text-[11px] text-[var(--text-secondary)] sm:hidden px-0.5">{t("scrollHint")}</p>
          <StaffCalendarGrid
            staff={data.staff}
            openMin={openMin}
            totalMin={totalMin}
            date={date}
            scale={scale}
            nowOffset={nowOffset}
            t={t}
            onSelect={(block, staff) => openVisit(block, staff)}
            onSlotClick={(staff) => handleSlotClick(staff)}
          />
        </div>
      )}

      {selected && (
        <VisitDetailsModal selected={selected} onClose={closeVisit} onCheckedIn={() => void refetch()} t={t} />
      )}

      {addSheetStaff && (
        <AddAppointmentSheet
          open={!!addSheetStaff}
          onClose={() => setAddSheetStaff(null)}
          branchId={branchId}
          staffId={addSheetStaff.staffId}
          staffName={addSheetStaff.staffName}
          staffOptions={(data?.staff ?? []).map((s) => ({ id: s.staffId, name: s.staffName }))}
          onCreated={() => void refetch()}
        />
      )}

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
