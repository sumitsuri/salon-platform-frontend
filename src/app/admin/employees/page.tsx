"use client";

import { useMemo, useState } from "react";
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
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState("");
  const [sectionTab, setSectionTab] = useState<SectionTab>("targets");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [error, setError] = useState("");

  const range = monthRange();
  const attendanceRange = range;

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
    queryKey: ["attendance-dashboard", branchFilter, range.start, range.end],
    queryFn: () =>
      api.getAttendanceDashboard({
        startDate: range.start,
        endDate: range.end,
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
        title="Employees"
        subtitle="Salary, targets & incentive management · CEO only"
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[9rem]`}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={() => setDrawer({ mode: "create" })} className={`${btnPrimary} py-2.5 px-4 shrink-0`}>
              <Plus className="w-4 h-4" />
              Add employee
            </button>
          </div>
        }
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <SegmentedControl
        options={[
          { id: "targets" as const, label: "Targets & coaching", icon: Target },
          { id: "attendance" as const, label: "Attendance & leave", icon: CalendarDays },
        ]}
        value={sectionTab}
        onChange={setSectionTab}
      />

      {sectionTab === "targets" ? (
        <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Meeting target" value={perfLoading ? "…" : (performance?.meetingTargetCount ?? 0)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Below target" value={perfLoading ? "…" : (performance?.belowTargetCount ?? 0)} icon={AlertTriangle} accent="amber" />
        <StatCard label="Active staff" value={employees.filter((e) => e.active).length} icon={Users} accent="brand" className="col-span-2 sm:col-span-1" />
      </div>

      <EmployeeTargetCoachingPanel performance={performance} loading={perfLoading} />

      {!trendsLoading && targetTrends && targetTrends.branches.length > 0 && (
        <EmployeeTargetTrends branches={targetTrends.branches} periodLabel={targetTrends.periodLabel} />
      )}

      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--brand-text)]" />
            Monthly target performance
            {performance?.periodLabel && (
              <span className="text-xs font-normal text-[var(--text-tertiary)]">· {performance.periodLabel}</span>
            )}
          </h2>
        </div>
        {perfLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">Loading performance...</p>
        ) : !performance?.staff.length ? (
          <EmptyState title="No target data" description="Add employees with monthly sales targets" />
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
                      subtitle={`${formatCurrency(p.actualSales)} of ${formatCurrency(p.monthlySalesTarget)} · ${p.achievementPercent}%`}
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
        <AttendanceDashboardSection
          data={attendanceDashboard}
          loading={attendanceLoading}
          startDate={attendanceRange.start}
          endDate={attendanceRange.end}
          showPageHeader={false}
        />
      )}

      {sectionTab === "targets" && (
      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Employee roster</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Tap an employee to view details · Salary & ID proof are CEO-only
          </p>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">Loading employees...</p>
        ) : employees.length === 0 ? (
          <EmptyState title="No employees" description="Add your first employee to get started" />
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
                        subtitle={[e.role.replace("_", " "), e.salary != null ? formatCurrency(e.salary) + "/mo" : null, perf ? `${perf.achievementPercent}% of target` : null].filter(Boolean).join(" · ")}
                        onClick={() => setDrawer({ mode: "view", employee: e })}
                        trailing={
                          <div className="flex items-center gap-2">
                            {!e.active && <StatusBadge status="INACTIVE" />}
                            {e.idProofCollected === false && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">ID pending</span>
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
          if (drawer && drawer.mode !== "create" && window.confirm(`Deactivate ${drawer.employee.name}?`)) {
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
  const cls = meeting
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : onTrack
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  const label = meeting ? "Target met" : onTrack ? "On track" : "Behind";
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
  if (!drawer) return null;

  const employee = drawer.mode !== "create" ? drawer.employee : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";

  const title = drawer.mode === "create" ? "New employee" : drawer.mode === "edit" ? "Edit employee" : employee?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? "Add a team member with salary and sales targets"
      : drawer.mode === "edit"
        ? "Update profile, compensation & targets"
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
              Edit employee
            </button>
            {employee.active && (
              <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
                <Trash2 className="w-4 h-4" />
                Deactivate
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
          cancelLabel={drawer.mode === "edit" ? "Back to details" : "Cancel"}
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
  return (
    <div className="space-y-5">
      {performance && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/40">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">This month</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(performance.actualSales)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                of {formatCurrency(performance.monthlySalesTarget)} target ({performance.achievementPercent}%)
              </p>
            </div>
            <TargetBadge meeting={performance.meetingTarget} onTrack={performance.onTrack} />
          </div>
          {performance.projectedIncentive > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-2">
              Projected incentive: {formatCurrency(performance.projectedIncentive)}
            </p>
          )}
        </div>
      )}

      <SectionTitle>Profile</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Phone" value={employee.phone} />
        <DetailField label="Branch" value={employee.branchName} />
        <DetailField label="Skills" value={employee.skills} />
        <DetailField label="Biometric ID" value={employee.biometricId} />
        <DetailField label="Status" value={employee.active ? "Active" : "Inactive"} />
      </div>

      <SectionTitle>Compensation & targets (CEO only)</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Monthly salary" value={employee.salary != null ? formatCurrency(employee.salary) : undefined} />
        <DetailField
          label="Joining date"
          value={employee.joiningDate ? new Date(employee.joiningDate + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined}
        />
        <DetailField label="Sales target" value={employee.monthlySalesTarget != null ? formatCurrency(employee.monthlySalesTarget) : undefined} />
        <DetailField label="Incentive" value={employee.incentivePercent != null ? `${employee.incentivePercent}% of target` : undefined} />
        <DetailField label="ID proof" value={employee.idProofCollected ? "Collected" : "Pending"} />
        <DetailField label="ID reference" value={employee.idProofReference} />
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
      <SectionTitle>Profile</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Branch *">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass} required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={selectClass}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Skills">
          <input placeholder="Hair, Skin, Grooming" value={skills} onChange={(e) => setSkills(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Biometric ID">
          <input value={biometricId} onChange={(e) => setBiometricId(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <SectionTitle>Compensation & targets</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Monthly salary (₹)">
          <input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Joining date">
          <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Monthly sales target (₹)">
          <input type="number" min={0} value={monthlySalesTarget} onChange={(e) => setMonthlySalesTarget(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Incentive % of target">
          <input type="number" min={0} max={100} step={0.5} value={incentivePercent} onChange={(e) => setIncentivePercent(e.target.value)} className={inputClass} />
        </Field>
        <Field label="ID proof collected">
          <label className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" checked={idProofCollected} onChange={(e) => setIdProofCollected(e.target.checked)} className="rounded border-[var(--border)]" />
            Document on file
          </label>
        </Field>
        <Field label="ID proof reference">
          <input placeholder="Aadhaar XXXX1234" value={idProofReference} onChange={(e) => setIdProofReference(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="flex gap-2 pt-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--surface)]">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>{cancelLabel}</button>
        <button type="submit" disabled={!name || !branchId || loading} className={`${btnPrimary} flex-1`}>
          {loading ? "Saving…" : employee ? "Save changes" : "Add employee"}
        </button>
      </div>
    </form>
  );
}
