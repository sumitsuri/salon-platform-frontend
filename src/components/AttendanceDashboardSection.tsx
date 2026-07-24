"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, CalendarOff, UserX, Clock } from "lucide-react";
import { MetricChart } from "@/components/LineChart";
import { api, AttendanceDashboard as AttendanceData } from "@/lib/api";
import { ATTENDANCE_CHART_COLORS } from "@/lib/chart-colors";
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
  const [logFilters, setLogFilters] = useState({ date: "", staff: "", branch: "", status: "" });
  const [logDebounced, setLogDebounced] = useState(logFilters);
  const [logPage, setLogPage] = useState(0);
  const [logSize, setLogSize] = useState(DEFAULT_PAGE_SIZE);
  const [leaveFilters, setLeaveFilters] = useState({ staff: "", branch: "", status: "" });
  const [leaveDebounced, setLeaveDebounced] = useState(leaveFilters);
  const [leavePage, setLeavePage] = useState(0);
  const [leaveSize, setLeaveSize] = useState(DEFAULT_PAGE_SIZE);

  function formatTime(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
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

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["attendance-log", startDate, endDate, logDebounced, logPage, logSize],
    queryFn: () =>
      api.getAttendance({
        startDate: logDebounced.date || startDate,
        endDate: logDebounced.date || endDate,
        staff: logDebounced.staff || undefined,
        branch: logDebounced.branch || undefined,
        status: logDebounced.status || undefined,
        page: logPage,
        size: logSize,
      }),
    enabled: showLeaveAndLogs && !!startDate && !!endDate,
  });

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ["leave-log", startDate, endDate, leaveDebounced, leavePage, leaveSize],
    queryFn: () =>
      api.getLeaves({
        startDate,
        endDate,
        staff: leaveDebounced.staff || undefined,
        branch: leaveDebounced.branch || undefined,
        status: leaveDebounced.status || undefined,
        page: leavePage,
        size: leaveSize,
      }),
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

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-tertiary)]">{t("loading")}</p>
      </Card>
    );
  }

  if (!data) return null;

  const logRecords = logData?.content ?? [];
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
              { label: t("score"), filter: { type: "none" } },
            ]}
          >
            {staffSlice.map((s) => (
              <tr key={s.staffId} className="border-t border-[var(--border)]">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{s.staffName}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{s.branchName}</p>
                </td>
                <td className="px-4 py-2.5">{s.daysPresent}</td>
                <td className="px-4 py-2.5">{s.daysLeave}</td>
                <td className="px-4 py-2.5">{s.totalHours}h</td>
                <td className="px-4 py-2.5">{s.lateArrivals}</td>
                <td className="px-4 py-2.5 font-semibold">{s.performanceScore}</td>
              </tr>
            ))}
          </FilterableTable>
        </div>
        <div className="md:hidden divide-y divide-[var(--border)]">
          {staffSlice.map((s) => (
            <ListRow
              key={s.staffId}
              title={s.staffName}
              subtitle={`${s.branchName} · ${t("daysHours", { days: s.daysPresent, hours: s.totalHours })}`}
              trailing={<span className="text-sm font-bold text-[var(--brand-text)]">{s.performanceScore}</span>}
            />
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
              <input
                placeholder={t("staff")}
                value={leaveFilters.staff}
                onChange={(e) => setLeaveFilters((f) => ({ ...f, staff: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)]"
              />
              <input
                placeholder={tCommon("branch")}
                value={leaveFilters.branch}
                onChange={(e) => setLeaveFilters((f) => ({ ...f, branch: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)]"
              />
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
                          type: "text",
                          placeholder: t("staff"),
                          value: logFilters.staff,
                          onChange: (v) => setLogFilters((f) => ({ ...f, staff: v })),
                        },
                      },
                      {
                        label: tCommon("branch"),
                        filter: {
                          type: "text",
                          placeholder: tCommon("branch"),
                          value: logFilters.branch,
                          onChange: (v) => setLogFilters((f) => ({ ...f, branch: v })),
                        },
                      },
                      { label: t("entry"), filter: { type: "none" } },
                      { label: t("exit"), filter: { type: "none" } },
                      { label: t("hours"), filter: { type: "none" } },
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
                        <td className="px-4 py-2.5">{r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : "—"}</td>
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
                      subtitle={`${formatDate(r.workDate)} · ${r.branchName}`}
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
    </section>
  );
}
