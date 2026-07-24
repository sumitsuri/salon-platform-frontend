"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserCheck, CalendarOff, UserX, Clock, ChevronRight } from "lucide-react";
import { MetricChart } from "@/components/LineChart";
import { api, AttendanceDashboard as AttendanceData, AttendanceRecord } from "@/lib/api";
import { formatCoords, formatPunchGeo } from "@/lib/attendance-geo";
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
  TablePagination,
  DEFAULT_PAGE_SIZE,
  SideSheet,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

interface Props {
  data?: AttendanceData;
  loading?: boolean;
  startDate?: string;
  endDate?: string;
  showPageHeader?: boolean;
  showLeaveAndLogs?: boolean;
}

export function AttendanceDashboardSection({
  data,
  loading,
  startDate,
  endDate,
  showPageHeader = true,
  showLeaveAndLogs = true,
}: Props) {
  const t = useTranslations("components.attendanceDashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const locale = useLocale();
  const [staffPage, setStaffPage] = useState(0);
  const [staffSize, setStaffSize] = useState(DEFAULT_PAGE_SIZE);
  const [logFilters, setLogFilters] = useState({ date: "", staffId: "", branchId: "", status: "", compliance: "" });
  const [logDebounced, setLogDebounced] = useState(logFilters);
  const [logPage, setLogPage] = useState(0);
  const [logSize, setLogSize] = useState(DEFAULT_PAGE_SIZE);
  const [leaveFilters, setLeaveFilters] = useState({ staffId: "", branchId: "", status: "" });
  const [leaveDebounced, setLeaveDebounced] = useState(leaveFilters);
  const [leavePage, setLeavePage] = useState(0);
  const [leaveSize, setLeaveSize] = useState(DEFAULT_PAGE_SIZE);
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

  useEffect(() => {
    const timer = setTimeout(() => setLogDebounced(logFilters), 300);
    return () => clearTimeout(timer);
  }, [logFilters]);

  useEffect(() => {
    const timer = setTimeout(() => setLeaveDebounced(leaveFilters), 300);
    return () => clearTimeout(timer);
  }, [leaveFilters]);

  useEffect(() => {
    setLogPage(0);
  }, [logDebounced, logSize, startDate, endDate]);

  useEffect(() => {
    setLeavePage(0);
  }, [leaveDebounced, leaveSize, startDate, endDate]);

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

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["attendance-log", startDate, endDate, logDebounced, logPage, logSize],
    queryFn: () =>
      api.getAttendance({
        startDate: logDebounced.date || startDate,
        endDate: logDebounced.date || endDate,
        staffId: logDebounced.staffId || undefined,
        branchId: logDebounced.branchId || undefined,
        status: logDebounced.status || undefined,
        page: logPage,
        size: logSize,
      }),
    enabled: showLeaveAndLogs && !!startDate && !!endDate,
  });

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ["leave-log", startDate, endDate, leaveDebounced, leavePage, leaveSize],
    queryFn: () => {
      const staff = leaveDebounced.staffId
        ? employees.find((e) => e.id === leaveDebounced.staffId)?.name
        : undefined;
      const branch = leaveDebounced.branchId
        ? branches.find((b) => b.id === leaveDebounced.branchId)?.name
        : undefined;
      return api.getLeaves({
        startDate,
        endDate,
        staff,
        branch,
        status: leaveDebounced.status || undefined,
        page: leavePage,
        size: leaveSize,
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

  const staffSummaries = data?.staffSummaries ?? [];
  const staffTotalPages = Math.ceil(staffSummaries.length / staffSize) || 0;
  const staffSlice = staffSummaries.slice(staffPage * staffSize, staffPage * staffSize + staffSize);
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

  const logRecords = useMemo(() => {
    const rows = logData?.content ?? [];
    if (logFilters.compliance === "late") return rows.filter((r) => r.late);
    if (logFilters.compliance === "early") return rows.filter((r) => r.earlyExit);
    return rows;
  }, [logData?.content, logFilters.compliance]);

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-tertiary)]">{t("loading")}</p>
      </Card>
    );
  }

  if (!data) return null;

  const leaveRecords = leaveData?.content ?? [];

  return (
    <section className="space-y-4">
      {showPageHeader && <PageHeader title={t("title")} subtitle={t("subtitle")} />}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label={t("totalStaff")} value={data.totalStaff} icon={Users} accent="brand" />
        <StatCard label={t("presentToday")} value={data.presentToday} icon={UserCheck} accent="emerald" />
        <StatCard label={t("onLeave")} value={data.onLeaveToday} icon={CalendarOff} accent="amber" />
        <StatCard label={t("absentToday")} value={data.absentToday} icon={UserX} accent="violet" />
        <StatCard
          label={t("avgHours")}
          value={`${data.avgHoursPerStaff}h`}
          icon={Clock}
          accent="brand"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {data.dailyTrends.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
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

      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t("staffPerformance")}</h3>
        </div>
        <div className="hidden md:block">
          <FilterableTable
            columns={[
              { label: t("staff"), filter: { type: "none" } },
              { label: t("days"), filter: { type: "none" } },
              { label: t("leave"), filter: { type: "none" } },
              { label: t("hours"), filter: { type: "none" } },
              { label: t("late"), filter: { type: "none" } },
              { label: t("geoFlags"), filter: { type: "none" } },
              { label: t("compliance"), filter: { type: "none" } },
              { label: t("score"), filter: { type: "none" } },
            ]}
          >
            {staffSlice.map((s) => (
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
            ))}
          </FilterableTable>
        </div>
        <div className="md:hidden divide-y divide-[var(--border)]">
          {staffSlice.map((s) => (
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
          ))}
        </div>
        <TablePagination
          page={staffPage}
          size={staffSize}
          totalPages={staffTotalPages}
          totalElements={staffSummaries.length}
          onPageChange={setStaffPage}
          onSizeChange={(s) => {
            setStaffSize(s);
            setStaffPage(0);
          }}
        />
      </Card>

      {showLeaveAndLogs && (
        <>
          <Card padding={false}>
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t("leaveRecords")}</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-[var(--border)]">
              <select
                value={leaveFilters.staffId}
                onChange={(e) => setLeaveFilters((f) => ({ ...f, staffId: e.target.value }))}
                className={selectClass}
                data-testid="leave-staff-filter"
              >
                <option value="">{t("allStaff")}</option>
                {staffOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={leaveFilters.branchId}
                onChange={(e) => setLeaveFilters((f) => ({ ...f, branchId: e.target.value }))}
                className={selectClass}
                data-testid="leave-branch-filter"
              >
                <option value="">{t("allBranches")}</option>
                {branchOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={leaveFilters.status}
                onChange={(e) => setLeaveFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)]"
              >
                <option value="">{t("allStatuses")}</option>
                <option value="APPROVED">{tStatus("APPROVED")}</option>
                <option value="PENDING">{tStatus("PENDING")}</option>
                <option value="REJECTED">{tStatus("REJECTED")}</option>
              </select>
            </div>
            {leaveLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
            ) : leaveRecords.length === 0 ? (
              <EmptyState title={t("noLeaveRecords")} description={t("inThisPeriod")} />
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
            <TablePagination
              page={leavePage}
              size={leaveSize}
              totalPages={leaveData?.totalPages ?? 0}
              totalElements={leaveData?.totalElements ?? 0}
              onPageChange={setLeavePage}
              onSizeChange={(s) => {
                setLeaveSize(s);
                setLeavePage(0);
              }}
            />
          </Card>

          <Card padding={false}>
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t("entryExitLog")}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("entryExitLogHint")}</p>
            </div>
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 border-b border-[var(--border)]">
              <select
                value={logFilters.compliance}
                onChange={(e) => setLogFilters((f) => ({ ...f, compliance: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)]"
                data-testid="attendance-compliance-filter"
              >
                <option value="">{t("allRecords")}</option>
                <option value="late">{t("lateOnly")}</option>
                <option value="early">{t("earlyExitOnly")}</option>
              </select>
            </div>
            {logLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
            ) : logRecords.length === 0 ? (
              <EmptyState title={t("noAttendanceRecords")} description={t("adjustFilters")} />
            ) : (
              <>
                <div className="hidden lg:block">
                  <FilterableTable
                    columns={[
                      {
                        label: t("date"),
                        filter: {
                          type: "date",
                          value: logFilters.date,
                          onChange: (v) => setLogFilters((f) => ({ ...f, date: v })),
                        },
                      },
                      {
                        label: t("staff"),
                        filter: {
                          type: "select",
                          value: logFilters.staffId,
                          onChange: (v) => setLogFilters((f) => ({ ...f, staffId: v })),
                          options: [{ value: "", label: t("allStaff") }, ...staffOptions],
                        },
                      },
                      {
                        label: tCommon("branch"),
                        filter: {
                          type: "select",
                          value: logFilters.branchId,
                          onChange: (v) => setLogFilters((f) => ({ ...f, branchId: v })),
                          options: [{ value: "", label: t("allBranches") }, ...branchOptions],
                        },
                      },
                      { label: t("entry"), filter: { type: "none" } },
                      { label: t("exit"), filter: { type: "none" } },
                      { label: t("expectedLocation"), filter: { type: "none" } },
                      { label: t("punchLocation"), filter: { type: "none" } },
                      { label: t("geofenceCheck"), filter: { type: "none" } },
                      { label: t("lateBy"), filter: { type: "none" } },
                      { label: t("earlyBy"), filter: { type: "none" } },
                      { label: t("hours"), filter: { type: "none" } },
                      { label: t("photo"), filter: { type: "none" } },
                      {
                        label: tCommon("status"),
                        filter: {
                          type: "select",
                          value: logFilters.status,
                          onChange: (v) => setLogFilters((f) => ({ ...f, status: v })),
                          options: [
                            { value: "", label: tCommon("all") },
                            { value: "COMPLETED", label: tStatus("COMPLETED") },
                            { value: "PRESENT", label: tStatus("PRESENT") },
                            { value: "ABSENT", label: tStatus("ABSENT") },
                          ],
                        },
                      },
                    ]}
                  >
                    {logRecords.map((r) => (
                      <tr key={r.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2.5">{formatDate(r.workDate)}</td>
                        <td className="px-4 py-2.5 font-medium">{r.staffName}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.branchName}</td>
                        <td className="px-4 py-2.5">{formatTime(r.entryTime)}</td>
                        <td className="px-4 py-2.5">{formatTime(r.exitTime)}</td>
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
                        <td className="px-4 py-2.5">{r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : "—"}</td>
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
                    ))}
                  </FilterableTable>
                </div>
                <div className="lg:hidden divide-y divide-[var(--border)]">
                  {logRecords.map((r) => (
                    <ListRow
                      key={r.id}
                      title={r.staffName}
                      subtitle={`${formatDate(r.workDate)} · ${r.branchName}${r.late ? ` · ${t("lateByShort", { duration: formatDuration(r.lateMinutes) })}` : ""}${r.earlyExit ? ` · ${t("earlyByShort", { duration: formatDuration(r.earlyExitMinutes) })}` : ""}`}
                      trailing={
                        <div className="text-right">
                          <p className="text-xs text-[var(--text-secondary)]">
                            {formatTime(r.entryTime)} – {formatTime(r.exitTime)}
                          </p>
                          <StatusBadge status={r.status} />
                        </div>
                      }
                    />
                  ))}
                </div>
              </>
            )}
            <TablePagination
              page={logPage}
              size={logSize}
              totalPages={logData?.totalPages ?? 0}
              totalElements={logData?.totalElements ?? 0}
              onPageChange={setLogPage}
              onSizeChange={(s) => {
                setLogSize(s);
                setLogPage(0);
              }}
            />
          </Card>
        </>
      )}

      <SideSheet
        open={!!selectedStaff}
        onClose={() => setSelectedStaffId(null)}
        title={selectedStaff?.staffName ?? ""}
        subtitle={selectedStaff ? `${selectedStaff.branchName} · ${t("complianceScore", { score: selectedStaff.complianceScore })}` : undefined}
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
