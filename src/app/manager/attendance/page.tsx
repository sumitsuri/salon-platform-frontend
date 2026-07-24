"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Fingerprint, PenLine, CalendarOff, List, Scan } from "lucide-react";
import { api, StaffItem } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  Card,
  SegmentedControl,
  AlertBanner,
  StatusBadge,
  ListRow,
  EmptyState,
  inputClass,
  selectClass,
  btnPrimary,
} from "@/components/ui";

type Tab = "biometric" | "manual" | "leave" | "log";

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

export default function ManagerAttendancePage() {
  const t = useTranslations("manager.attendance");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("biometric");
  const [scanMsg, setScanMsg] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);

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

  const { data: todayLog = [], isLoading: logLoading } = useQuery({
    queryKey: ["attendance-today", branchId],
    queryFn: () => api.getTodayAttendance(branchId),
    enabled: !!branchId,
  });

  const presentCount = todayLog.filter((r) => r.status === "PRESENT" || r.status === "COMPLETED").length;

  const punchMutation = useMutation({
    mutationFn: (biometricId: string) => api.biometricPunch(biometricId),
    onSuccess: (result) => {
      setScanMsg(result.message);
      setScanError("");
      queryClient.invalidateQueries({ queryKey: ["attendance-today", branchId] });
    },
    onError: (e: Error) => {
      setScanError(e.message);
      setScanMsg("");
    },
  });

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

  async function simulateScan(member: StaffItem) {
    if (!member.biometricId) {
      setScanError(t("noBiometric", { name: member.name }));
      return;
    }
    setScanning(true);
    setScanError("");
    setScanMsg(t("scanning"));
    await new Promise((r) => setTimeout(r, 600));
    punchMutation.mutate(member.biometricId);
    setScanning(false);
  }

  const tabs = [
    { id: "biometric" as Tab, label: t("tabs.scan"), icon: Fingerprint },
    { id: "manual" as Tab, label: t("tabs.manual"), icon: PenLine },
    { id: "leave" as Tab, label: t("tabs.leave"), icon: CalendarOff },
    { id: "log" as Tab, label: t("tabs.today"), icon: List },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          branch: user?.branchName ?? "",
          present: presentCount,
          total: staff.length,
        })}
      />

      <SegmentedControl options={tabs} value={tab} onChange={setTab} />

      {tab === "biometric" && (
        <Card className="overflow-hidden">
          <div className="scan-zone -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 px-4 sm:px-5 pt-6 pb-5 text-center">
            <div
              className={cn(
                "w-24 h-24 mx-auto rounded-2xl flex items-center justify-center border-2 transition shadow-inner",
                scanning
                  ? "border-[var(--brand)] bg-[var(--brand-light)] animate-pulse"
                  : "border-[var(--border)] bg-[var(--surface)]"
              )}
            >
              <Fingerprint className="w-12 h-12 text-[var(--brand-text)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-4">{t("readyToScan")}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">{t("scanHint")}</p>
          </div>

          {scanMsg && (
            <div className="mb-4">
              <AlertBanner variant="success">{scanMsg}</AlertBanner>
            </div>
          )}
          {scanError && (
            <div className="mb-4">
              <AlertBanner variant="error">{scanError}</AlertBanner>
            </div>
          )}

          <p className="section-label mb-2">{t("staffRoster")}</p>
          <div className="grid grid-cols-2 gap-2">
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => simulateScan(s)}
                disabled={scanning || punchMutation.isPending}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] text-left transition active:scale-[0.98] disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--brand-light)] flex items-center justify-center shrink-0">
                  <Scan className="w-4 h-4 text-[var(--brand-text)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{s.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] truncate">{s.biometricId || t("noFp")}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
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
                <ListRow
                  key={r.id}
                  title={r.staffName}
                  subtitle={t("inOut", { in: formatTime(r.entryTime), out: formatTime(r.exitTime) })}
                  trailing={<StatusBadge status={r.status} />}
                />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
