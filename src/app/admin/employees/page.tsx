"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Pencil,
  Plus,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import {
  api,
  CreateEmployeeRequest,
  EmployeeDetail,
  StaffRole,
  StaffTargetPerformanceItem,
  UpdateEmployeeRequest,
} from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { EmployeeTargetTrends } from "@/components/EmployeeTargetTrends";
import { EmployeeTargetCoachingPanel } from "@/components/EmployeeTargetCoachingPanel";
import { AttendanceDashboardSection } from "@/components/AttendanceDashboardSection";
import {
  PageHeader,
  Card,
  StatCard,
  ListRow,
  EmptyState,
  AlertBanner,
  StatusBadge,
  SideSheet,
  DetailField,
  SegmentedControl,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

const STAFF_ROLES: StaffRole[] = ["STYLIST", "BRANCH_MANAGER", "SALON_MANAGER"];

type SectionTab = "targets" | "attendance";

type DrawerState =
  | { mode: "create" }
  | { mode: "view" | "edit"; employee: EmployeeDetail };

function monthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider pt-2 pb-1">
      {children}
    </p>
  );
}

export default function AdminEmployeesPage() {
  const t = useTranslations("admin.employees");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState("");
  const [sectionTab, setSectionTab] = useState<SectionTab>("targets");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [error, setError] = useState("");

  const range = monthRange();
  const [attendanceStart, setAttendanceStart] = useState(range.start);
  const [attendanceEnd, setAttendanceEnd] = useState(range.end);
  const attendanceRange = { start: attendanceStart, end: attendanceEnd };

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", branchFilter],
    queryFn: () => api.getAllStaff(branchFilter || undefined),
  });

  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ["staff-targets", branchFilter, range.start, range.end],
    queryFn: () =>
      api.getStaffTargetPerformance({
        startDate: range.start,
        endDate: range.end,
        branchIds: branchFilter ? [branchFilter] : undefined,
      }),
  });

  const { data: targetTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["staff-target-trends", branchFilter, range.start, range.end],
    queryFn: () =>
      api.getStaffTargetTrends({
        startDate: range.start,
        endDate: range.end,
        branchIds: branchFilter ? [branchFilter] : undefined,
      }),
  });

  const { data: attendanceDashboard, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-dashboard", branchFilter, attendanceRange.start, attendanceRange.end],
    queryFn: () =>
      api.getAttendanceDashboard({
        startDate: attendanceRange.start,
        endDate: attendanceRange.end,
        branchIds: branchFilter ? [branchFilter] : undefined,
      }),
    enabled: sectionTab === "attendance",
  });

  const perfByStaff = useMemo(() => {
    const map = new Map<string, StaffTargetPerformanceItem>();
    performance?.staff.forEach((p) => map.set(p.staffId, p));
    return map;
  }, [performance]);

  const byBranch = useMemo(() => {
    const groups = new Map<string, EmployeeDetail[]>();
    for (const e of employees) {
      const key = e.branchName || e.branchId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return groups;
  }, [employees]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["staff-targets"] });
  };

  const closeDrawer = () => setDrawer(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeRequest) => api.createEmployee(data),
    onSuccess: () => { invalidate(); closeDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeRequest }) =>
      api.updateEmployee(id, data),
    onSuccess: () => { invalidate(); closeDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deactivateEmployee(id),
    onSuccess: () => { invalidate(); closeDrawer(); },
    onError: (e: Error) => setError(e.message),
  });

  const selectedEmployee = drawer && drawer.mode !== "create" ? drawer.employee : null;
  const selectedPerf = selectedEmployee ? perfByStaff.get(selectedEmployee.id) : null;
  const formLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[9rem]`}
            >
              <option value="">{t("allBranches")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={() => setDrawer({ mode: "create" })} className={`${btnPrimary} py-2.5 px-4 shrink-0`}>
              <Plus className="w-4 h-4" />
              {t("addEmployee")}
            </button>
          </div>
        }
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <SegmentedControl
        options={[
          { id: "targets" as const, label: t("tabs.targets"), icon: Target },
          { id: "attendance" as const, label: t("tabs.attendance"), icon: CalendarDays },
        ]}
        value={sectionTab}
        onChange={setSectionTab}
      />

      {sectionTab === "targets" ? (
        <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t("meetingTarget")} value={perfLoading ? "…" : (performance?.meetingTargetCount ?? 0)} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("belowTarget")} value={perfLoading ? "…" : (performance?.belowTargetCount ?? 0)} icon={AlertTriangle} accent="amber" />
        <StatCard label={t("activeStaff")} value={employees.filter((e) => e.active).length} icon={Users} accent="brand" className="col-span-2 sm:col-span-1" />
      </div>

      <EmployeeTargetCoachingPanel performance={performance} loading={perfLoading} />

      {!trendsLoading && targetTrends && targetTrends.branches.length > 0 && (
        <EmployeeTargetTrends branches={targetTrends.branches} periodLabel={targetTrends.periodLabel} />
      )}

      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--brand-text)]" />
            {t("monthlyPerformance")}
            {performance?.periodLabel && (
              <span className="text-xs font-normal text-[var(--text-tertiary)]">· {performance.periodLabel}</span>
            )}
          </h2>
        </div>
        {perfLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingPerformance")}</p>
        ) : !performance?.staff.length ? (
          <EmptyState title={t("noTargetDataTitle")} description={t("noTargetDataDesc")} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {Array.from(
              performance.staff.reduce((map, item) => {
                if (!map.has(item.branchName)) map.set(item.branchName, []);
                map.get(item.branchName)!.push(item);
                return map;
              }, new Map<string, typeof performance.staff>())
            ).map(([branchName, items]) => (
              <div key={branchName}>
                <p className="px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--surface-muted)]/50">
                  {branchName}
                </p>
                {items.map((p) => {
                  const emp = employees.find((e) => e.id === p.staffId);
                  return (
                    <ListRow
                      key={p.staffId}
                      title={p.staffName}
                      subtitle={t("salesOfTarget", {
                        actual: formatCurrency(p.actualSales),
                        target: formatCurrency(p.monthlySalesTarget),
                        percent: p.achievementPercent,
                      })}
                      onClick={() => emp && setDrawer({ mode: "view", employee: emp })}
                      trailing={
                        <div className="flex items-center gap-2">
                          <TargetBadge meeting={p.meetingTarget} onTrack={p.onTrack} />
                          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </div>
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>
        </>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <Field label={t("attendanceFrom")}>
                <input
                  type="date"
                  value={attendanceStart}
                  onChange={(e) => setAttendanceStart(e.target.value)}
                  className={inputClass}
                  data-testid="attendance-date-from"
                />
              </Field>
              <Field label={t("attendanceTo")}>
                <input
                  type="date"
                  value={attendanceEnd}
                  onChange={(e) => setAttendanceEnd(e.target.value)}
                  className={inputClass}
                  data-testid="attendance-date-to"
                />
              </Field>
            </div>
          </Card>
          <AttendanceDashboardSection
            data={attendanceDashboard}
            loading={attendanceLoading}
            startDate={attendanceRange.start}
            endDate={attendanceRange.end}
            showPageHeader={false}
          />
        </>
      )}

      {sectionTab === "targets" && (
      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("roster")}</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {t("rosterHint")}
          </p>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingEmployees")}</p>
        ) : employees.length === 0 ? (
          <EmptyState title={t("noEmployeesTitle")} description={t("noEmployeesDesc")} />
        ) : (
          <div>
            {Array.from(byBranch.entries()).map(([branchName, list]) => (
              <div key={branchName}>
                <p className="px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--surface-muted)]/50">
                  {branchName}
                </p>
                <div className="divide-y divide-[var(--border)]">
                  {list.map((e) => {
                    const perf = perfByStaff.get(e.id);
                    const isSelected = drawer && drawer.mode !== "create" && drawer.employee.id === e.id;
                    return (
                      <ListRow
                        key={e.id}
                        title={e.name}
                        subtitle={[e.role.replace("_", " "), e.salary != null ? t("perMonth", { amount: formatCurrency(e.salary) }) : null, perf ? t("ofTargetShort", { percent: perf.achievementPercent }) : null].filter(Boolean).join(" · ")}
                        onClick={() => setDrawer({ mode: "view", employee: e })}
                        trailing={
                          <div className="flex items-center gap-2">
                            {!e.active && <StatusBadge status="INACTIVE" />}
                            {e.idProofCollected === false && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">{t("idPending")}</span>
                            )}
                            <ChevronRight className={cn("w-4 h-4", isSelected ? "text-[var(--brand-text)]" : "text-[var(--text-tertiary)]")} />
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}

      <EmployeeDrawer
        drawer={drawer}
        branches={branches}
        performance={selectedPerf}
        loading={formLoading}
        onClose={closeDrawer}
        onEdit={() => drawer && drawer.mode === "view" && setDrawer({ mode: "edit", employee: drawer.employee })}
        onBackToView={() => drawer && drawer.mode === "edit" && setDrawer({ mode: "view", employee: drawer.employee })}
        onDeactivate={() => {
          if (drawer && drawer.mode !== "create" && window.confirm(t("deactivateConfirm", { name: drawer.employee.name }))) {
            deleteMutation.mutate(drawer.employee.id);
          }
        }}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
      />
    </div>
  );
}

function TargetBadge({ meeting, onTrack }: { meeting: boolean; onTrack: boolean }) {
  const tAdmin = useTranslations("admin.common");
  const cls = meeting
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : onTrack
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  const label = meeting ? tAdmin("targetMet") : onTrack ? tAdmin("onTrack") : tAdmin("behind");
  return <span className={cn("text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border", cls)}>{label}</span>;
}

function EmployeeDrawer({
  drawer,
  branches,
  performance,
  loading,
  onClose,
  onEdit,
  onBackToView,
  onDeactivate,
  onCreate,
  onUpdate,
}: {
  drawer: DrawerState | null;
  branches: { id: string; name: string }[];
  performance: StaffTargetPerformanceItem | null | undefined;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onDeactivate: () => void;
  onCreate: (data: CreateEmployeeRequest) => void;
  onUpdate: (id: string, data: UpdateEmployeeRequest) => void;
}) {
  const t = useTranslations("admin.employees");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  if (!drawer) return null;

  const employee = drawer.mode !== "create" ? drawer.employee : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";

  const title = drawer.mode === "create" ? t("newEmployee") : drawer.mode === "edit" ? t("editEmployee") : employee?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? t("newEmployeeSubtitle")
      : drawer.mode === "edit"
        ? t("editEmployeeSubtitle")
        : [employee?.role?.replace("_", " "), employee?.branchName].filter(Boolean).join(" · ");

  return (
    <SideSheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      wide
      footer={
        isView && employee ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={onEdit} className={`${btnPrimary} flex-1`}>
              <Pencil className="w-4 h-4" />
              {t("editEmployeeBtn")}
            </button>
            {employee.active && (
              <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
                <Trash2 className="w-4 h-4" />
                {tCommon("deactivate")}
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {isView && employee && <EmployeeDetailView employee={employee} performance={performance} />}
      {isForm && (
        <EmployeeForm
          key={drawer.mode === "create" ? "create" : employee!.id}
          branches={branches}
          employee={employee}
          loading={loading}
          onCancel={() => {
            if (drawer.mode === "edit") onBackToView();
            else onClose();
          }}
          onSubmit={(data) => {
            if (drawer.mode === "create") onCreate(data as CreateEmployeeRequest);
            else if (employee) onUpdate(employee.id, data);
          }}
          cancelLabel={drawer.mode === "edit" ? tAdmin("backToDetails") : tCommon("cancel")}
        />
      )}
    </SideSheet>
  );
}

function EmployeeDetailView({
  employee,
  performance,
}: {
  employee: EmployeeDetail;
  performance: StaffTargetPerformanceItem | null | undefined;
}) {
  const t = useTranslations("admin.employees");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-5">
      {performance && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/40">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{tAdmin("thisMonth")}</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(performance.actualSales)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {tAdmin("ofTarget", {
                  target: formatCurrency(performance.monthlySalesTarget),
                  percent: performance.achievementPercent,
                })}
              </p>
            </div>
            <TargetBadge meeting={performance.meetingTarget} onTrack={performance.onTrack} />
          </div>
          {performance.projectedIncentive > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-2">
              {t("projectedIncentive", { amount: formatCurrency(performance.projectedIncentive) })}
            </p>
          )}
        </div>
      )}

      <SectionTitle>{tAdmin("profile")}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label={tCommon("phone")} value={employee.phone} />
        <DetailField label={tCommon("branch")} value={employee.branchName} />
        <DetailField label={t("skills")} value={employee.skills} />
        <DetailField label={t("biometricId")} value={employee.biometricId} />
        <DetailField label={tCommon("status")} value={employee.active ? tCommon("active") : tCommon("inactive")} />
      </div>

      <SectionTitle>{t("compensationSection")}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label={t("monthlySalary")} value={employee.salary != null ? formatCurrency(employee.salary) : undefined} />
        <DetailField
          label={t("joiningDate")}
          value={employee.joiningDate ? new Date(employee.joiningDate + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined}
        />
        <DetailField label={t("salesTarget")} value={employee.monthlySalesTarget != null ? formatCurrency(employee.monthlySalesTarget) : undefined} />
        <DetailField label={t("incentive")} value={employee.incentivePercent != null ? t("incentiveOfTarget", { percent: employee.incentivePercent }) : undefined} />
        <DetailField label={t("idProof")} value={employee.idProofCollected ? t("collected") : t("pending")} />
        <DetailField label={t("idProofReference")} value={employee.idProofReference} />
      </div>
    </div>
  );
}

function EmployeeForm({
  branches,
  employee,
  loading,
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
}: {
  branches: { id: string; name: string }[];
  employee: EmployeeDetail | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateEmployeeRequest | UpdateEmployeeRequest) => void;
  cancelLabel?: string;
}) {
  const t = useTranslations("admin.employees");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tOrg = useTranslations("admin.organization");
  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [branchId, setBranchId] = useState(employee?.branchId ?? branches[0]?.id ?? "");
  const [role, setRole] = useState<StaffRole>(employee?.role ?? "STYLIST");
  const [skills, setSkills] = useState(employee?.skills ?? "");
  const [biometricId, setBiometricId] = useState(employee?.biometricId ?? "");
  const [salary, setSalary] = useState(employee?.salary?.toString() ?? "");
  const [joiningDate, setJoiningDate] = useState(employee?.joiningDate ?? "");
  const [idProofCollected, setIdProofCollected] = useState(employee?.idProofCollected ?? false);
  const [idProofReference, setIdProofReference] = useState(employee?.idProofReference ?? "");
  const [monthlySalesTarget, setMonthlySalesTarget] = useState(employee?.monthlySalesTarget?.toString() ?? "");
  const [incentivePercent, setIncentivePercent] = useState(employee?.incentivePercent?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      phone: phone || undefined,
      branchId,
      role,
      skills: skills || undefined,
      biometricId: biometricId || undefined,
      salary: salary ? Number(salary) : undefined,
      joiningDate: joiningDate || undefined,
      idProofCollected,
      idProofReference: idProofReference || undefined,
      monthlySalesTarget: monthlySalesTarget ? Number(monthlySalesTarget) : undefined,
      incentivePercent: incentivePercent ? Number(incentivePercent) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <SectionTitle>{tAdmin("profile")}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("fullName")}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label={tCommon("phone")}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label={`${tCommon("branch")} *`}>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass} required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label={tOrg("role")}>
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={selectClass}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label={t("skills")}>
          <input placeholder={t("skillsPlaceholder")} value={skills} onChange={(e) => setSkills(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("biometricId")}>
          <input value={biometricId} onChange={(e) => setBiometricId(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <SectionTitle>{t("compensationTargets")}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("monthlySalaryField")}>
          <input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("joiningDate")}>
          <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("monthlySalesTargetField")}>
          <input type="number" min={0} value={monthlySalesTarget} onChange={(e) => setMonthlySalesTarget(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("incentiveField")}>
          <input type="number" min={0} max={100} step={0.5} value={incentivePercent} onChange={(e) => setIncentivePercent(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("idProofCollected")}>
          <label className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" checked={idProofCollected} onChange={(e) => setIdProofCollected(e.target.checked)} className="rounded border-[var(--border)]" />
            {t("documentOnFile")}
          </label>
        </Field>
        <Field label={t("idProofReference")}>
          <input placeholder={t("idProofPlaceholder")} value={idProofReference} onChange={(e) => setIdProofReference(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="flex gap-2 pt-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--surface)]">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>{cancelLabel}</button>
        <button type="submit" disabled={!name || !branchId || loading} className={`${btnPrimary} flex-1`}>
          {loading ? tCommon("saving") : employee ? tAdmin("saveChanges") : t("addEmployeeBtn")}
        </button>
      </div>
    </form>
  );
}
