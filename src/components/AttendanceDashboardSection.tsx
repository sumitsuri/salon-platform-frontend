"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserCheck, CalendarOff, UserX, Clock, ChevronRight } from "lucide-react";
import { MetricChart } from "@/components/LineChart";
import { api, AttendanceDashboard as AttendanceData, AttendanceRecord } from "@/lib/api";
import { formatCoords, formatPunchGeo } from "@/lib/attendance-geo";
import { cn } from "@/lib/utils";
import { ATTENDANCE_CHART_COLORS } from "@/lib/chart-colors";
import { AttendancePhotoThumb } from "@/components/AttendancePhotoThumb";
import {
  Card,
  StatCard,
  ListRow,
  StatusBadge,
  EmptyState,
  PageHeader,
  FilterableTable,
  InfiniteScrollFooter,
  TableFilterToolbar,
  SideSheet,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { useClientInfiniteList } from "@/lib/use-client-infinite-list";

const ATTENDANCE_TABLE_PAGE_SIZE = 10;
const DAILY_HOURS_TARGET = 10;
const LOG_TABLE_COLUMN_COUNT = 14;

interface Props {
  data?: AttendanceData;
  loading?: boolean;
  startDate?: string;
  endDate?: string;
  branchFilter?: string;
  showPageHeader?: boolean;
  showLeaveAndLogs?: boolean;
}

export function AttendanceDashboardSection({
  data,
  loading,
  startDate,
  endDate,
  branchFilter = "",
  showPageHeader = true,
  showLeaveAndLogs = true,
}: Props) {
  const t = useTranslations("components.attendanceDashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const locale = useLocale();
  const [logFilters, setLogFilters] = useState({
    date: "",
    staffId: "",
    branchId: branchFilter,
    status: "",
    compliance: "",
  });
  const [logDebounced, setLogDebounced] = useState(logFilters);
  const [leaveFilters, setLeaveFilters] = useState({
    date: "",
    staffId: "",
    branchId: branchFilter,
    status: "",
  });
  const [leaveDebounced, setLeaveDebounced] = useState(leaveFilters);
  const [staffPerfFilters, setStaffPerfFilters] = useState({ staffId: "", branchId: branchFilter });
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState<"NOTE" | "PENALTY" | "IMPROVEMENT">("NOTE");
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentPenalty, setIncidentPenalty] = useState("");
  const queryClient = useQueryClient();

  function formatTime(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  function formatDuration(minutes?: number | null) {
    if (minutes == null || minutes <= 0) return "—";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatHoursDelta(hours: number) {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes > 0 ? `${whole}h ${minutes}m` : `${whole}h`;
  }

  function hoursTargetLabel(hoursWorked?: number | null) {
    if (hoursWorked == null) return null;
    const delta = hoursWorked - DAILY_HOURS_TARGET;
    if (Math.abs(delta) < 0.05) {
      return { label: t("hoursTargetMet"), tone: "ok" as const };
    }
    if (delta > 0) {
      return { label: t("hoursTargetOver", { delta: formatHoursDelta(delta) }), tone: "ok" as const };
    }
    return { label: t("hoursTargetShort", { delta: formatHoursDelta(Math.abs(delta)) }), tone: "warn" as const };
  }

  useEffect(() => {
    const timer = setTimeout(() => setLogDebounced(logFilters), 300);
    return () => clearTimeout(timer);
  }, [logFilters]);

  useEffect(() => {
    const timer = setTimeout(() => setLeaveDebounced(leaveFilters), 300);
    return () => clearTimeout(timer);
  }, [leaveFilters]);

  useEffect(() => {
    setLogFilters((f) => ({ ...f, branchId: branchFilter }));
    setLeaveFilters((f) => ({ ...f, branchId: branchFilter }));
    setStaffPerfFilters((f) => ({ ...f, branchId: branchFilter }));
  }, [branchFilter]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    enabled: showLeaveAndLogs,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.getAllStaff(),
    enabled: showLeaveAndLogs,
  });

  const staffOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.name })),
    [employees]
  );

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches]
  );

  const {
    items: logRowsRaw,
    totalElements: logTotalElements,
    hasMore: logHasMore,
    isLoading: logLoading,
    isFetchingNextPage: logFetchingNext,
    fetchNextPage: fetchNextLogPage,
  } = useInfinitePagedList({
    queryKey: ["attendance-log", startDate, endDate, logDebounced],
    queryFn: (page) =>
      api.getAttendance({
        startDate: logDebounced.date || startDate,
        endDate: logDebounced.date || endDate,
        staffId: logDebounced.staffId || undefined,
        branchId: logDebounced.branchId || undefined,
        status: logDebounced.status || undefined,
        page,
        size: ATTENDANCE_TABLE_PAGE_SIZE,
      }),
    enabled: showLeaveAndLogs && !!startDate && !!endDate,
  });

  const {
    items: leaveRecords,
    totalElements: leaveTotalElements,
    hasMore: leaveHasMore,
    isLoading: leaveLoading,
    isFetchingNextPage: leaveFetchingNext,
    fetchNextPage: fetchNextLeavePage,
  } = useInfinitePagedList({
    queryKey: ["leave-log", startDate, endDate, leaveDebounced, employees, branches],
    queryFn: (page) => {
      const staff = leaveDebounced.staffId
        ? employees.find((e) => e.id === leaveDebounced.staffId)?.name
        : undefined;
      const branch = leaveDebounced.branchId
        ? branches.find((b) => b.id === leaveDebounced.branchId)?.name
        : undefined;
      return api.getLeaves({
        startDate: leaveDebounced.date || startDate,
        endDate: leaveDebounced.date || endDate,
        staff,
        branch,
        status: leaveDebounced.status || undefined,
        page,
        size: ATTENDANCE_TABLE_PAGE_SIZE,
      });
    },
    enabled: showLeaveAndLogs && !!startDate && !!endDate,
  });

  const trendLabels = useMemo(
    () => data?.dailyTrends.map((entry) => formatDate(entry.date)) ?? [],
    [data, locale]
  );

  const presentSeries = useMemo(
    () =>
      data
        ? [{ name: t("presentSeries"), color: ATTENDANCE_CHART_COLORS.present, values: data.dailyTrends.map((entry) => entry.presentCount) }]
        : [],
    [data, t]
  );

  const hoursSeries = useMemo(
    () =>
      data
        ? [{ name: t("avgHoursSeries"), color: ATTENDANCE_CHART_COLORS.hours, values: data.dailyTrends.map((entry) => entry.avgHours) }]
        : [],
    [data, t]
  );

  const logRecords = useMemo(() => {
    if (logFilters.compliance === "late") return logRowsRaw.filter((r) => r.late);
    if (logFilters.compliance === "early") return logRowsRaw.filter((r) => r.earlyExit);
    return logRowsRaw;
  }, [logRowsRaw, logFilters.compliance]);

  const staffSummaries = data?.staffSummaries ?? [];
  const filteredStaffSummaries = useMemo(() => {
    return staffSummaries.filter((s) => {
      if (staffPerfFilters.staffId && s.staffId !== staffPerfFilters.staffId) return false;
      if (staffPerfFilters.branchId) {
        const branch = branches.find((b) => b.id === staffPerfFilters.branchId);
        if (branch && s.branchName !== branch.name) return false;
      }
      return true;
    });
  }, [staffSummaries, staffPerfFilters, branches]);
  const {
    visible: staffSlice,
    totalElements: staffTotalElements,
    loadedCount: staffLoadedCount,
    hasMore: staffHasMore,
    loadMore: loadMoreStaff,
  } = useClientInfiniteList(filteredStaffSummaries, ATTENDANCE_TABLE_PAGE_SIZE);
  const selectedStaff = staffSummaries.find((s) => s.staffId === selectedStaffId);

  const { data: incidentData, isLoading: incidentsLoading } = useQuery({
    queryKey: ["attendance-incidents", selectedStaffId],
    queryFn: () => api.getAttendanceIncidents(selectedStaffId!, 0, 20),
    enabled: !!selectedStaffId,
  });

  const incidentMutation = useMutation({
    mutationFn: () =>
      api.createAttendanceIncident({
        staffId: selectedStaffId!,
        type: incidentType,
        note: incidentNote,
        penaltyAmount: incidentType === "PENALTY" && incidentPenalty ? Number(incidentPenalty) : undefined,
      }),
    onSuccess: () => {
      setIncidentNote("");
      setIncidentPenalty("");
      queryClient.invalidateQueries({ queryKey: ["attendance-incidents", selectedStaffId] });
    },
  });

  const staffRecords = useMemo(() => {
    if (!selectedStaffId || !data?.recentRecords) return [] as AttendanceRecord[];
    return data.recentRecords.filter((r) => r.staffId === selectedStaffId);
  }, [selectedStaffId, data?.recentRecords]);

  const logFilterColumns = useMemo(
    () => [
      {
        label: t("date"),
        filter: {
          type: "date" as const,
          value: logFilters.date,
          onChange: (v: string) => setLogFilters((f) => ({ ...f, date: v })),
        },
      },
      {
        label: t("staff"),
        filter: {
          type: "select" as const,
          value: logFilters.staffId,
          onChange: (v: string) => setLogFilters((f) => ({ ...f, staffId: v })),
          options: [{ value: "", label: t("allStaff") }, ...staffOptions],
        },
      },
      {
        label: tCommon("branch"),
        filter: {
          type: "select" as const,
          value: logFilters.branchId,
          onChange: (v: string) => setLogFilters((f) => ({ ...f, branchId: v })),
          options: [{ value: "", label: t("allBranches") }, ...branchOptions],
        },
      },
      {
        label: t("lateBy"),
        filterLabel: t("recordFilter"),
        filter: {
          type: "select" as const,
          value: logFilters.compliance,
          onChange: (v: string) => setLogFilters((f) => ({ ...f, compliance: v })),
          options: [
            { value: "", label: t("allRecords") },
            { value: "late", label: t("lateOnly") },
            { value: "early", label: t("earlyExitOnly") },
          ],
        },
      },
      {
        label: tCommon("status"),
        filter: {
          type: "select" as const,
          value: logFilters.status,
          onChange: (v: string) => setLogFilters((f) => ({ ...f, status: v })),
          options: [
            { value: "", label: tCommon("all") },
            { value: "COMPLETED", label: tStatus("COMPLETED") },
            { value: "PRESENT", label: tStatus("PRESENT") },
            { value: "ABSENT", label: tStatus("ABSENT") },
          ],
        },
      },
    ],
    [t, tCommon, tStatus, logFilters, staffOptions, branchOptions]
  );

  const leaveFilterColumns = useMemo(
    () => [
      {
        label: t("date"),
        filter: {
          type: "date" as const,
          value: leaveFilters.date,
          onChange: (v: string) => setLeaveFilters((f) => ({ ...f, date: v })),
        },
      },
      {
        label: t("staff"),
        filter: {
          type: "select" as const,
          value: leaveFilters.staffId,
          onChange: (v: string) => setLeaveFilters((f) => ({ ...f, staffId: v })),
          options: [{ value: "", label: t("allStaff") }, ...staffOptions],
        },
      },
      {
        label: tCommon("branch"),
        filter: {
          type: "select" as const,
          value: leaveFilters.branchId,
          onChange: (v: string) => setLeaveFilters((f) => ({ ...f, branchId: v })),
          options: [{ value: "", label: t("allBranches") }, ...branchOptions],
        },
      },
      {
        label: tCommon("status"),
        filter: {
          type: "select" as const,
          value: leaveFilters.status,
          onChange: (v: string) => setLeaveFilters((f) => ({ ...f, status: v })),
          options: [
            { value: "", label: t("allStatuses") },
            { value: "APPROVED", label: tStatus("APPROVED") },
            { value: "PENDING", label: tStatus("PENDING") },
            { value: "REJECTED", label: tStatus("REJECTED") },
          ],
        },
      },
    ],
    [t, tCommon, tStatus, leaveFilters, staffOptions, branchOptions]
  );

  const logHeaderColumns = useMemo(
    () => [
      { label: t("date"), filter: { type: "none" as const } },
      { label: t("staff"), filter: { type: "none" as const } },
      { label: tCommon("branch"), filter: { type: "none" as const } },
      { label: t("entry"), filter: { type: "none" as const } },
      { label: t("exit"), filter: { type: "none" as const } },
      { label: t("expectedLocation"), filter: { type: "none" as const } },
      { label: t("punchLocation"), filter: { type: "none" as const } },
      { label: t("geofenceCheck"), filter: { type: "none" as const } },
      { label: t("lateBy"), filter: { type: "none" as const } },
      { label: t("earlyBy"), filter: { type: "none" as const } },
      { label: t("hours"), filter: { type: "none" as const } },
      { label: t("hoursTarget"), filter: { type: "none" as const } },
      { label: t("photo"), filter: { type: "none" as const } },
      { label: tCommon("status"), filter: { type: "none" as const } },
    ],
    [t, tCommon]
  );

  const staffPerfFilterColumns = useMemo(
    () => [
      {
        label: t("staff"),
        filter: {
          type: "select" as const,
          value: staffPerfFilters.staffId,
          onChange: (v: string) => setStaffPerfFilters((f) => ({ ...f, staffId: v })),
          options: [{ value: "", label: t("allStaff") }, ...staffOptions],
        },
      },
      {
        label: tCommon("branch"),
        filter: {
          type: "select" as const,
          value: staffPerfFilters.branchId,
          onChange: (v: string) => setStaffPerfFilters((f) => ({ ...f, branchId: v })),
          options: [{ value: "", label: t("allBranches") }, ...branchOptions],
        },
      },
    ],
    [t, tCommon, staffPerfFilters, staffOptions, branchOptions]
  );

  const staffPerfHeaderColumns = useMemo(
    () => [
      { label: t("staff"), filter: { type: "none" as const } },
      { label: t("days"), filter: { type: "none" as const } },
      { label: t("leave"), filter: { type: "none" as const } },
      { label: t("hours"), filter: { type: "none" as const } },
      { label: t("late"), filter: { type: "none" as const } },
      { label: t("geoFlags"), filter: { type: "none" as const } },
      { label: t("compliance"), filter: { type: "none" as const } },
      { label: t("score"), filter: { type: "none" as const } },
    ],
    [t]
  );

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-tertiary)]">{t("loading")}</p>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4">
      {showPageHeader && <PageHeader title={t("title")} subtitle={t("subtitle")} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label={t("totalStaff")} value={data.totalStaff} icon={Users} accent="brand" />
        <StatCard label={t("presentToday")} value={data.presentToday} icon={UserCheck} accent="emerald" />
        <StatCard label={t("onLeave")} value={data.onLeaveToday} icon={CalendarOff} accent="amber" />
        <StatCard label={t("absentToday")} value={data.absentToday} icon={UserX} accent="violet" />
        <StatCard
          label={t("avgHours")}
          value={`${data.avgHoursPerStaff}h`}
          icon={Clock}
          accent="brand"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {data.dailyTrends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <MetricChart title={t("dailyPresentCount")} labels={trendLabels} series={presentSeries} />
          </Card>
          <Card>
            <MetricChart
              title={t("avgWorkingHours")}
              labels={trendLabels}
              series={hoursSeries}
              formatValue={(v) => `${v.toFixed(1)}h`}
            />
          </Card>
        </div>
      )}

      {showLeaveAndLogs && (
        <>
          <Card padding={false} className="min-w-0 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t("entryExitLog")}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("entryExitLogHint")}</p>
            </div>
            <TableFilterToolbar columns={logFilterColumns} />
            {logLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
            ) : (
              <>
                <div className="hidden md:block responsive-table-wrap">
                  <FilterableTable columns={logHeaderColumns} className="min-w-[72rem]">
                    {logRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={LOG_TABLE_COLUMN_COUNT}
                          className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]"
                        >
                          {t("noAttendanceRecords")} · {t("adjustFilters")}
                        </td>
                      </tr>
                    ) : (
                      logRecords.map((r) => {
                        const target = hoursTargetLabel(r.hoursWorked);
                        return (
                          <tr key={r.id} className="border-t border-[var(--border)]">
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.workDate)}</td>
                            <td className="px-4 py-2.5 font-medium">{r.staffName}</td>
                            <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.branchName}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatTime(r.entryTime)}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatTime(r.exitTime)}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-[var(--text-secondary)]">
                              {formatCoords(r.branchLatitude, r.branchLongitude)}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono text-[var(--text-secondary)]">
                              <div>{t("checkInShort")}: {formatCoords(r.entryLatitude, r.entryLongitude)}</div>
                              <div>{t("checkOutShort")}: {formatCoords(r.exitLatitude, r.exitLongitude)}</div>
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              <div className={r.entryGeoStatus === "OUT_OF_GEOFENCE" ? "text-amber-700 font-medium" : ""}>
                                {t("checkInShort")}: {formatPunchGeo(r, "entry")}
                              </div>
                              <div className={r.exitGeoStatus === "OUT_OF_GEOFENCE" ? "text-amber-700 font-medium" : ""}>
                                {t("checkOutShort")}: {formatPunchGeo(r, "exit")}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              {r.late ? (
                                <span className="text-amber-700 font-medium">{formatDuration(r.lateMinutes)}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {r.earlyExit ? (
                                <span className="text-red-700 font-medium">{formatDuration(r.earlyExitMinutes)}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : "—"}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {target ? (
                                <span
                                  className={cn(
                                    "font-semibold text-sm",
                                    target.tone === "ok" ? "text-emerald-700" : "text-amber-700"
                                  )}
                                >
                                  {target.label}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {r.hasEntryPhoto ? (
                                <AttendancePhotoThumb recordId={r.id} type="entry" className="w-10 h-10" />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </FilterableTable>
                </div>
                <div className="md:hidden divide-y divide-[var(--border)]">
                  {logRecords.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-center text-[var(--text-secondary)]">
                      {t("noAttendanceRecords")} · {t("adjustFilters")}
                    </p>
                  ) : (
                    logRecords.map((r) => {
                      const target = hoursTargetLabel(r.hoursWorked);
                      return (
                        <div key={r.id} className="px-4 py-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{r.staffName}</p>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                {formatDate(r.workDate)} · {r.branchName}
                              </p>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-[var(--surface-muted)]/60 px-2.5 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("entry")}</p>
                              <p className="font-medium mt-0.5">{formatTime(r.entryTime)}</p>
                            </div>
                            <div className="rounded-lg bg-[var(--surface-muted)]/60 px-2.5 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("exit")}</p>
                              <p className="font-medium mt-0.5">{formatTime(r.exitTime)}</p>
                            </div>
                            <div className="rounded-lg bg-[var(--surface-muted)]/60 px-2.5 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("hours")}</p>
                              <p className="font-medium mt-0.5">{r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : "—"}</p>
                            </div>
                            <div className="rounded-lg bg-[var(--surface-muted)]/60 px-2.5 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("hoursTarget")}</p>
                              <p
                                className={cn(
                                  "font-semibold mt-0.5",
                                  target?.tone === "ok" ? "text-emerald-700" : target ? "text-amber-700" : "text-[var(--text-primary)]"
                                )}
                              >
                                {target?.label ?? "—"}
                              </p>
                            </div>
                          </div>
                          {(r.late || r.earlyExit) && (
                            <p className="text-xs text-amber-700">
                              {[
                                r.late && t("lateByShort", { duration: formatDuration(r.lateMinutes) }),
                                r.earlyExit && t("earlyByShort", { duration: formatDuration(r.earlyExitMinutes) }),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
            <InfiniteScrollFooter
              totalElements={logTotalElements}
              loadedCount={logRecords.length}
              hasMore={logHasMore}
              isFetchingNextPage={logFetchingNext}
              isLoading={logLoading}
              onLoadMore={() => void fetchNextLogPage()}
            />
          </Card>

          <Card padding={false} className="min-w-0 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t("leaveRecords")}</h3>
            </div>
            <TableFilterToolbar columns={leaveFilterColumns} className="lg:grid-cols-4" />
            {leaveLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
            ) : leaveRecords.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center text-[var(--text-secondary)]">
                {t("noLeaveRecords")} · {t("adjustFilters")}
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {leaveRecords.map((l) => (
                  <ListRow
                    key={l.id}
                    title={l.staffName}
                    subtitle={`${formatDate(l.startDate)} – ${formatDate(l.endDate)} · ${l.branchName}`}
                    trailing={<StatusBadge status={l.status} />}
                  />
                ))}
              </div>
            )}
            <InfiniteScrollFooter
              totalElements={leaveTotalElements}
              loadedCount={leaveRecords.length}
              hasMore={leaveHasMore}
              isFetchingNextPage={leaveFetchingNext}
              isLoading={leaveLoading}
              onLoadMore={() => void fetchNextLeavePage()}
            />
          </Card>
        </>
      )}

      <Card padding={false} className="min-w-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t("staffPerformance")}</h3>
        </div>
        <TableFilterToolbar columns={staffPerfFilterColumns} className="lg:grid-cols-2" />
        <div className="hidden md:block responsive-table-wrap">
          <FilterableTable columns={staffPerfHeaderColumns}>
            {staffSlice.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  {t("noAttendanceRecords")} · {t("adjustFilters")}
                </td>
              </tr>
            ) : (
              staffSlice.map((s) => (
                <tr
                  key={s.staffId}
                  className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--surface-muted)]/60"
                  onClick={() => setSelectedStaffId(s.staffId)}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{s.staffName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{s.branchName}</p>
                  </td>
                  <td className="px-4 py-2.5">{s.daysPresent}</td>
                  <td className="px-4 py-2.5">{s.daysLeave}</td>
                  <td className="px-4 py-2.5">{s.totalHours}h</td>
                  <td className="px-4 py-2.5">{s.lateArrivals}</td>
                  <td className="px-4 py-2.5">{s.geoFlags}</td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--brand-text)]">{s.complianceScore}</td>
                  <td className="px-4 py-2.5 font-semibold">{s.performanceScore}</td>
                </tr>
              ))
            )}
          </FilterableTable>
        </div>
        <div className="md:hidden divide-y divide-[var(--border)]">
          {staffSlice.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-[var(--text-secondary)]">
              {t("noAttendanceRecords")} · {t("adjustFilters")}
            </p>
          ) : (
            staffSlice.map((s) => (
              <button
                key={s.staffId}
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedStaffId(s.staffId)}
              >
                <ListRow
                  title={s.staffName}
                  subtitle={`${s.branchName} · ${t("complianceScore", { score: s.complianceScore })}`}
                  trailing={
                    <div className="flex items-center gap-1 text-sm font-bold text-[var(--brand-text)]">
                      {s.performanceScore}
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                  }
                />
              </button>
            ))
          )}
        </div>
        <InfiniteScrollFooter
          totalElements={staffTotalElements}
          loadedCount={staffLoadedCount}
          hasMore={staffHasMore}
          isFetchingNextPage={false}
          onLoadMore={loadMoreStaff}
        />
      </Card>

      <SideSheet
        open={!!selectedStaff}
        onClose={() => setSelectedStaffId(null)}
        title={selectedStaff?.staffName ?? ""}
        subtitle={
          selectedStaff
            ? `${selectedStaff.branchName} · ${t("complianceScore", { score: selectedStaff.complianceScore })}`
            : undefined
        }
        wide
      >
        {selectedStaff && (
          <div className="space-y-5 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">{t("late")}</p>
                <p className="text-lg font-bold">{selectedStaff.lateArrivals}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">{t("earlyExits")}</p>
                <p className="text-lg font-bold">{selectedStaff.earlyExits}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">{t("geoFlags")}</p>
                <p className="text-lg font-bold">{selectedStaff.geoFlags}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">{t("compliance")}</p>
                <p className="text-lg font-bold text-[var(--brand-text)]">{selectedStaff.complianceScore}</p>
              </div>
            </div>

            {staffRecords.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">{t("recentPunches")}</h4>
                <div className="space-y-2">
                  {staffRecords.map((r) => (
                    <div key={r.id} className="flex gap-3 items-center p-2 rounded-lg border border-[var(--border)]">
                      {r.hasEntryPhoto && (
                        <AttendancePhotoThumb recordId={r.id} type="entry" className="w-12 h-12 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{formatDate(r.workDate)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatTime(r.entryTime)} – {formatTime(r.exitTime)}
                        </p>
                        {(r.late || r.earlyExit || (r.complianceFlags?.length ?? 0) > 0) && (
                          <p className="text-xs text-amber-700 mt-0.5">
                            {[r.late && t("lateFlag"), r.earlyExit && t("earlyExitFlag"), ...(r.complianceFlags ?? [])]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-2">{t("addIncident")}</h4>
              <div className="space-y-3">
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as typeof incidentType)}
                  className={selectClass}
                >
                  <option value="NOTE">{t("incidentNote")}</option>
                  <option value="PENALTY">{t("incidentPenalty")}</option>
                  <option value="IMPROVEMENT">{t("incidentImprovement")}</option>
                </select>
                <textarea
                  value={incidentNote}
                  onChange={(e) => setIncidentNote(e.target.value)}
                  placeholder={t("incidentNotePlaceholder")}
                  className={`${inputClass} min-h-[80px]`}
                />
                {incidentType === "PENALTY" && (
                  <input
                    type="number"
                    min={0}
                    value={incidentPenalty}
                    onChange={(e) => setIncidentPenalty(e.target.value)}
                    placeholder={t("penaltyAmount")}
                    className={inputClass}
                  />
                )}
                {incidentMutation.error && (
                  <p className="text-sm text-red-600">{(incidentMutation.error as Error).message}</p>
                )}
                <button
                  type="button"
                  onClick={() => incidentMutation.mutate()}
                  disabled={!incidentNote.trim() || incidentMutation.isPending}
                  className={`${btnPrimary} w-full`}
                >
                  {incidentMutation.isPending ? tCommon("saving") : t("saveIncident")}
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">{t("incidentHistory")}</h4>
              {incidentsLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
              ) : (incidentData?.content.length ?? 0) === 0 ? (
                <EmptyState title={t("noIncidents")} description={t("noIncidentsDesc")} />
              ) : (
                <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
                  {incidentData?.content.map((inc) => (
                    <div key={inc.id} className="px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{inc.type}</span>
                        {inc.penaltyAmount != null && (
                          <span className="text-xs font-medium text-red-700">₹{inc.penaltyAmount}</span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{inc.note}</p>
                      {inc.createdAt && (
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          {new Date(inc.createdAt).toLocaleString(locale)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setSelectedStaffId(null)} className={`${btnSecondary} w-full`}>
              {tCommon("cancel")}
            </button>
          </div>
        )}
      </SideSheet>
    </section>
  );
}
