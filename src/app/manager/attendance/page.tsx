"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Camera, MapPin, PenLine, CalendarOff, List, UserCheck, LogOut, Clock } from "lucide-react";
import { api, AttendanceRecord, StaffItem } from "@/lib/api";
import { formatCoords, geoStatusLabel } from "@/lib/attendance-geo";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { AttendancePunchModal } from "@/components/AttendancePunchModal";
import { AttendancePhotoThumb } from "@/components/AttendancePhotoThumb";
import { DashboardHero } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import {
  PageHeader,
  Card,
  SegmentedControl,
  AlertBanner,
  StatusBadge,
  EmptyState,
  inputClass,
  selectClass,
  btnPrimary,
} from "@/components/ui";

type Tab = "checkin" | "manual" | "leave" | "log";
type StaffPunchStatus = "NOT_STARTED" | "CHECKED_IN" | "COMPLETED";

function getStaffPunchStatus(record?: AttendanceRecord): StaffPunchStatus {
  if (!record?.entryTime) return "NOT_STARTED";
  if (!record.exitTime) return "CHECKED_IN";
  return "COMPLETED";
}

function formatDuration(minutes?: number | null) {
  if (minutes == null || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function GeoBadge({ status }: { status?: AttendanceRecord["entryGeoStatus"] }) {
  const t = useTranslations("manager.attendance");
  if (!status) return null;
  const labels: Record<string, string> = {
    IN_GEOFENCE: t("geoIn"),
    OUT_OF_GEOFENCE: t("geoOut"),
    GPS_UNAVAILABLE: t("geoGpsOff"),
  };
  const colors: Record<string, string> = {
    IN_GEOFENCE: "text-emerald-700 bg-emerald-50 border-emerald-200",
    OUT_OF_GEOFENCE: "text-amber-700 bg-amber-50 border-amber-200",
    GPS_UNAVAILABLE: "text-slate-600 bg-slate-50 border-slate-200",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", colors[status])}>
      {labels[status]}
    </span>
  );
}

export default function ManagerAttendancePage() {
  const t = useTranslations("manager.attendance");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("checkin");
  const [punchMsg, setPunchMsg] = useState("");
  const [punchStaff, setPunchStaff] = useState<StaffItem | null>(null);
  const [punchAction, setPunchAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");
  const [punchingStaffId, setPunchingStaffId] = useState<string | null>(null);

  const [manualStaffId, setManualStaffId] = useState("");
  const [manualDate, setManualDate] = useState(todayStr());
  const [manualEntry, setManualEntry] = useState("09:00");
  const [manualExit, setManualExit] = useState("18:00");
  const [manualReason, setManualReason] = useState("");

  const [leaveStaffId, setLeaveStaffId] = useState("");
  const [leaveStart, setLeaveStart] = useState(todayStr());
  const [leaveEnd, setLeaveEnd] = useState(todayStr());
  const [leaveReason, setLeaveReason] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", branchId],
    queryFn: () => api.getStaff(branchId),
    enabled: !!branchId,
  });

  const { data: branchGeo } = useQuery({
    queryKey: ["branch-geofence", branchId],
    queryFn: () => api.getBranch(branchId),
    enabled: !!branchId,
  });

  const { data: todayLog = [], isLoading: logLoading } = useQuery({
    queryKey: ["attendance-today", branchId],
    queryFn: () => api.getTodayAttendance(branchId),
    enabled: !!branchId,
  });

  const presentCount = todayLog.filter((r) => r.status === "PRESENT" || r.status === "COMPLETED").length;

  const recordByStaff = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    todayLog.forEach((r) => map.set(r.staffId, r));
    return map;
  }, [todayLog]);

  const manualMutation = useMutation({
    mutationFn: () =>
      api.manualAttendance({
        staffId: manualStaffId,
        workDate: manualDate,
        entryTime: manualEntry ? toIso(manualDate, manualEntry) : undefined,
        exitTime: manualExit ? toIso(manualDate, manualExit) : undefined,
        reason: manualReason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today", branchId] });
      setManualReason("");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      api.createLeave({
        staffId: leaveStaffId,
        startDate: leaveStart,
        endDate: leaveEnd,
        leaveType: "FULL_DAY",
        reason: leaveReason,
      }),
    onSuccess: () => {
      setLeaveReason("");
      queryClient.invalidateQueries({ queryKey: ["leaves", branchId] });
    },
  });

  function openPunch(staffMember: StaffItem, action: "CHECK_IN" | "CHECK_OUT") {
    const record = recordByStaff.get(staffMember.id);
    const status = getStaffPunchStatus(record);
    if (action === "CHECK_IN" && status !== "NOT_STARTED") return;
    if (action === "CHECK_OUT" && status !== "CHECKED_IN") return;
    if (punchStaff || punchingStaffId) return;
    setPunchAction(action);
    setPunchStaff(staffMember);
    setPunchingStaffId(staffMember.id);
  }

  const tabs = [
    { id: "checkin" as Tab, label: t("tabs.checkin"), icon: UserCheck },
    { id: "manual" as Tab, label: t("tabs.manual"), icon: PenLine },
    { id: "leave" as Tab, label: t("tabs.leave"), icon: CalendarOff },
    { id: "log" as Tab, label: t("tabs.today"), icon: List },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          branch: user?.branchName ?? "",
          present: presentCount,
          total: staff.length,
        })}
      />

      <DashboardHero
        eyebrow={user?.branchName}
        title={t("title")}
        subtitle={t("readyToCheckIn")}
        metric={`${presentCount}/${staff.length}`}
        metricLabel={t("tabs.checkin")}
        badge={
          presentCount === staff.length && staff.length > 0 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-white text-xs font-bold border border-emerald-300/30">
              All present
            </span>
          ) : undefined
        }
      />

      <MissionStrip />

      <SegmentedControl options={tabs} value={tab} onChange={setTab} />

      {tab === "checkin" && (
        <Card className="overflow-hidden">
          <div className="scan-zone -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 px-4 sm:px-5 pt-6 pb-5 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center border-2 border-[var(--brand)] bg-[var(--brand-light)] shadow-inner">
              <Camera className="w-12 h-12 text-[var(--brand-text)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-4">{t("readyToCheckIn")}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">{t("checkInHint")}</p>
          </div>

          {punchMsg && (
            <div className="mb-4">
              <AlertBanner variant="success">{punchMsg}</AlertBanner>
            </div>
          )}

          <p className="section-label mb-2">{t("staffRoster")}</p>
          <div className="space-y-2" data-testid="attendance-staff-roster">
            {staff.map((s) => {
              const record = recordByStaff.get(s.id);
              const status = getStaffPunchStatus(record);
              const isPunching = punchingStaffId === s.id;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-xl border p-3",
                    status === "COMPLETED"
                      ? "border-[var(--border)] bg-[var(--surface-muted)]/60"
                      : status === "CHECKED_IN"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-[var(--border)] bg-[var(--surface-muted)]"
                  )}
                  data-testid={`attendance-staff-${status.toLowerCase().replace("_", "-")}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--text-primary)]">{s.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                        {status === "COMPLETED"
                          ? t("statusCompleted", { in: formatTime(record?.entryTime), out: formatTime(record?.exitTime) })
                          : status === "CHECKED_IN"
                            ? t("statusCheckedIn", { time: formatTime(record?.entryTime) })
                            : t("notCheckedInToday")}
                      </p>
                      {record?.entryGeoStatus && status !== "NOT_STARTED" && (
                        <p className={cn("text-[10px] mt-1 flex items-center gap-1", record.entryGeoStatus === "OUT_OF_GEOFENCE" ? "text-amber-700 font-medium" : "text-emerald-700")}>
                          <MapPin className="w-3 h-3" />
                          {t("checkInShort")}: {geoStatusLabel(record.entryGeoStatus)}
                          {record.entryDistanceMeters != null && ` (${record.entryDistanceMeters}m)`}
                        </p>
                      )}
                      {record?.exitGeoStatus && status === "COMPLETED" && (
                        <p className={cn("text-[10px] mt-0.5 flex items-center gap-1", record.exitGeoStatus === "OUT_OF_GEOFENCE" ? "text-amber-700 font-medium" : "text-emerald-700")}>
                          <MapPin className="w-3 h-3" />
                          {t("checkOutShort")}: {geoStatusLabel(record.exitGeoStatus)}
                          {record.exitDistanceMeters != null && ` (${record.exitDistanceMeters}m)`}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={status === "NOT_STARTED" ? "ABSENT" : status === "CHECKED_IN" ? "PRESENT" : "COMPLETED"} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={status !== "NOT_STARTED" || !!punchStaff || isPunching}
                      onClick={() => openPunch(s, "CHECK_IN")}
                      className={cn(
                        btnPrimary,
                        "flex-1 py-2 text-xs",
                        status !== "NOT_STARTED" && "opacity-40 cursor-not-allowed"
                      )}
                      data-testid={`check-in-${s.id}`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {t("checkInBtn")}
                    </button>
                    <button
                      type="button"
                      disabled={status !== "CHECKED_IN" || !!punchStaff || isPunching}
                      onClick={() => openPunch(s, "CHECK_OUT")}
                      className={cn(
                        btnPrimary,
                        "flex-1 py-2 text-xs bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
                        status !== "CHECKED_IN" && "opacity-40 cursor-not-allowed"
                      )}
                      data-testid={`check-out-${s.id}`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t("checkOutBtn")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {punchStaff && (
        <AttendancePunchModal
          staff={punchStaff}
          branch={branchGeo ?? null}
          open={!!punchStaff}
          action={punchAction}
          existingRecord={recordByStaff.get(punchStaff.id)}
          onClose={() => {
            setPunchStaff(null);
            setPunchingStaffId(null);
          }}
          onSuccess={(msg) => {
            setPunchMsg(msg);
            setPunchingStaffId(null);
            queryClient.invalidateQueries({ queryKey: ["attendance-today", branchId] });
          }}
        />
      )}

      {tab === "manual" && (
        <Card className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">{t("manualHint")}</p>
          <select value={manualStaffId} onChange={(e) => setManualStaffId(e.target.value)} className={selectClass}>
            <option value="">{t("selectStaff")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--text-secondary)] font-medium">{t("entry")}</span>
              <input type="time" value={manualEntry} onChange={(e) => setManualEntry(e.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--text-secondary)] font-medium">{t("exit")}</span>
              <input type="time" value={manualExit} onChange={(e) => setManualExit(e.target.value)} className={inputClass} />
            </label>
          </div>
          <input
            placeholder={t("reasonOptional")}
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            className={inputClass}
          />
          {manualMutation.error && (
            <AlertBanner variant="error">{(manualMutation.error as Error).message}</AlertBanner>
          )}
          <button
            onClick={() => manualMutation.mutate()}
            disabled={!manualStaffId || manualMutation.isPending}
            className={`${btnPrimary} w-full`}
          >
            {manualMutation.isPending ? tCommon("processing") : t("saveAttendance")}
          </button>
        </Card>
      )}

      {tab === "leave" && (
        <Card className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">{t("leaveHint")}</p>
          <select value={leaveStaffId} onChange={(e) => setLeaveStaffId(e.target.value)} className={selectClass}>
            <option value="">{t("selectStaff")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--text-secondary)] font-medium">{t("from")}</span>
              <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--text-secondary)] font-medium">{t("to")}</span>
              <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className={inputClass} />
            </label>
          </div>
          <input placeholder={t("reason")} value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className={inputClass} />
          {leaveMutation.error && (
            <AlertBanner variant="error">{(leaveMutation.error as Error).message}</AlertBanner>
          )}
          <button
            onClick={() => leaveMutation.mutate()}
            disabled={!leaveStaffId || leaveMutation.isPending}
            className={`${btnPrimary} w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/20`}
          >
            {leaveMutation.isPending ? t("submitting") : t("submitLeave")}
          </button>
        </Card>
      )}

      {tab === "log" && (
        <Card padding={false}>
          <div className="px-4 py-3.5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("todaysLog")}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("records", { count: todayLog.length })}</p>
          </div>
          {logLoading ? (
            <p className="p-4 text-[var(--text-tertiary)] text-sm">{tCommon("loading")}</p>
          ) : todayLog.length === 0 ? (
            <EmptyState title={t("noAttendanceTitle")} description={t("noAttendanceDesc")} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {todayLog.map((r) => (
                <div key={r.id} className="px-4 py-3 flex gap-3 items-start">
                  {r.hasEntryPhoto ? (
                    <AttendancePhotoThumb recordId={r.id} type="entry" className="w-12 h-12 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] shrink-0 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-[var(--text-primary)]">{r.staffName}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {t("inOut", { in: formatTime(r.entryTime), out: formatTime(r.exitTime) })}
                    </p>
                    {(r.lateMinutes != null && r.lateMinutes > 0) || (r.earlyExitMinutes != null && r.earlyExitMinutes > 0) ? (
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.lateMinutes != null && r.lateMinutes > 0 && t("lateBy", { duration: formatDuration(r.lateMinutes) })}
                        {r.lateMinutes != null && r.lateMinutes > 0 && r.earlyExitMinutes != null && r.earlyExitMinutes > 0 && " · "}
                        {r.earlyExitMinutes != null && r.earlyExitMinutes > 0 && t("earlyBy", { duration: formatDuration(r.earlyExitMinutes) })}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {r.entryGeoStatus && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-[var(--text-tertiary)]" />
                          <GeoBadge status={r.entryGeoStatus} />
                        </span>
                      )}
                      {r.late && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border text-amber-700 bg-amber-50 border-amber-200 font-medium">
                          {t("lateFlag")}
                        </span>
                      )}
                      {r.earlyExit && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border text-red-700 bg-red-50 border-red-200 font-medium">
                          {t("earlyExitFlag")}
                        </span>
                      )}
                      {r.entryVerified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200 font-medium">
                          {t("verifiedFlag")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
