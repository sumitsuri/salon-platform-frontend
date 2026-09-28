"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
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
  StatCard,
  StatusBadge,
  btnPrimary,
  btnPrimarySm,
  btnSecondary,
  EmptyState,
  MobileStatGrid,
  ResponsiveTableShell,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { OnlineBookingPanel } from "@/components/book/OnlineBookingPanel";
import { OnlineAppointmentsList, collectOnlineAppointments } from "@/components/book/OnlineAppointmentsList";
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

function occupancyTone(occ: string) {
  if (occ === "FREE") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-500/30";
  if (occ === "OVERDUE") return "bg-rose-500/15 text-rose-800 dark:text-rose-300 ring-rose-500/30";
  return "bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-500/30";
}

function blockAccent(block: StaffTimeBlock) {
  if (block.overdue) return "bg-rose-500";
  if (block.status === "CONFIRMED") return "bg-sky-500";
  if (block.status === "IN_PROGRESS") return "bg-[var(--brand)]";
  if (block.status === "READY_FOR_BILLING") return "bg-amber-500";
  return "bg-stone-400";
}

function StaffAgendaCard({
  column,
  isToday,
  t,
  onSelect,
}: {
  column: StaffAvailabilityColumn;
  isToday: boolean;
  t: ReturnType<typeof useTranslations>;
  onSelect: (block: StaffTimeBlock, staff: StaffAvailabilityColumn) => void;
}) {
  const sortedBlocks = useMemo(
    () => [...column.blocks].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [column.blocks]
  );
  const addBookingHref = `/manager/walk-in?staffId=${column.staffId}`;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3 sm:px-4 py-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_5%,var(--surface))]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-[var(--text-primary)] truncate">{column.staffName}</p>
            <span
              className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ring-1 ${occupancyTone(column.occupancy)}`}
            >
              {column.occupancy === "FREE"
                ? t("free")
                : column.occupancy === "OVERDUE"
                  ? t("overdue")
                  : t("busy")}
            </span>
          </div>
          {column.skills && (
            <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{column.skills}</p>
          )}
          {isToday && column.occupancy !== "FREE" && (
            <p className="text-[10px] text-[var(--text-secondary)] leading-snug mt-1">
              {column.occupancy === "OVERDUE"
                ? t("runningLate")
                : t("freeIn", {
                    mins: column.remainingMinutes ?? 0,
                    time: column.busyUntil ? formatClock(column.busyUntil) : "—",
                  })}
            </p>
          )}
          {isToday && column.occupancy === "FREE" && column.freeSlots[0] && (
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-snug mt-1">
              {t("nextGap", { mins: column.freeSlots[0].minutes })}
            </p>
          )}
        </div>
        <Link
          href={addBookingHref}
          className={`${btnPrimarySm} shrink-0 touch-manipulation`}
          title={t("addBookingFor", { name: column.staffName })}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{t("addBooking")}</span>
        </Link>
      </div>

      {sortedBlocks.length === 0 ? (
        <Link
          href={addBookingHref}
          className="flex flex-col items-center gap-1 px-3 sm:px-4 py-6 text-center touch-manipulation hover:bg-[var(--surface-muted)] transition"
        >
          <p className="text-sm text-[var(--text-secondary)]">{t("noAppointments")}</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)]">
            <Plus className="w-3.5 h-3.5" />
            {t("addBooking")}
          </span>
        </Link>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {sortedBlocks.map((block) => (
            <li key={block.bookingId}>
              <button
                type="button"
                onClick={() => onSelect(block, column)}
                title={t("clickForDetails")}
                className="w-full flex items-stretch gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left transition hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] touch-manipulation"
              >
                <span className={`w-1 rounded-full shrink-0 ${blockAccent(block)}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {formatClock(block.startAt)} – {formatClock(block.endAt)}
                    </span>
                    <StatusBadge status={block.status} />
                  </span>
                  <span className="block text-sm text-[var(--text-primary)] truncate mt-0.5">
                    {block.customerName}
                  </span>
                  <span className="block text-xs text-[var(--text-secondary)] truncate mt-0.5">
                    {block.services.join(" · ")}
                  </span>
                  {block.overdue && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 mt-1">
                      {t("overdue")}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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

      {branch ? <OnlineBookingPanel branch={branch} compact /> : null}

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
        <div className="space-y-3 min-w-0">
          {data.staff.map((col) => (
            <StaffAgendaCard
              key={col.staffId}
              column={col}
              isToday={isToday}
              t={t}
              onSelect={(block, staff) => openVisit(block, staff)}
            />
          ))}
        </div>
      )}

      {selected && (
        <VisitDetailsModal selected={selected} onClose={closeVisit} onCheckedIn={() => void refetch()} t={t} />
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
