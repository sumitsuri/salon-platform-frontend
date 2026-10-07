"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  UserX,
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
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getDefaultDateRange, reviveStoredProductDateRange } from "@/lib/date-range";
import { resolveStaffDesignation, STAFF_DESIGNATION_OPTIONS, type StaffDesignation } from "@/lib/staff-designations";
import { usePersistentState } from "@/lib/use-persistent-state";
import {
  PageHeader,
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
  btnPrimarySm,
} from "@/components/ui";

const STAFF_ROLES: StaffRole[] = ["STYLIST", "BRANCH_MANAGER", "SALON_MANAGER"];

type SectionTab = "targets" | "attendance" | "roster";
type RosterFilter = "active" | "inactive" | "all";

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type DrawerState =
  | { mode: "create" }
  | { mode: "view" | "edit"; employee: EmployeeDetail };

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
  const tPeriods = useTranslations("components.dateRange.periods");
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = usePersistentState(
    "admin-dashboard:dateRange",
    getDefaultDateRange,
    reviveStoredProductDateRange,
  );
  const [sectionTab, setSectionTab] = useState<SectionTab>("attendance");
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("active");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [error, setError] = useState("");

  const {
    branches,
    selectedBranches,
    setSelectedBranches,
    branchIdsFilter,
    branchesSelected,
  } = useAdminBranchSelection("all", { from: dateRange.from, to: dateRange.to });

  const { data: allEmployees = [], isLoading } = useQuery({
    queryKey: ["employees", branchIdsFilter],
    queryFn: () => api.getAllStaff(),
  });

  const employees = useMemo(() => {
    if (!branchIdsFilter) return allEmployees;
    return allEmployees.filter((employee) => branchIdsFilter.includes(employee.branchId));
  }, [allEmployees, branchIdsFilter]);

  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ["staff-targets", branchIdsFilter, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getStaffTargetPerformance({
        startDate: dateRange.from,
        endDate: dateRange.to,
        branchIds: branchIdsFilter,
      }),
    enabled: branchesSelected,
  });

  const { data: targetTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["staff-target-trends", branchIdsFilter, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getStaffTargetTrends({
        startDate: dateRange.from,
        endDate: dateRange.to,
        branchIds: branchIdsFilter,
      }),
    enabled: branchesSelected,
  });

  const { data: attendanceDashboard, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-dashboard", branchIdsFilter, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getAttendanceDashboard({
        startDate: dateRange.from,
        endDate: dateRange.to,
        branchIds: branchIdsFilter,
      }),
    enabled: branchesSelected && sectionTab === "attendance",
  });

  const perfByStaff = useMemo(() => {
    const map = new Map<string, StaffTargetPerformanceItem>();
    performance?.staff.forEach((p) => map.set(p.staffId, p));
    return map;
  }, [performance]);

  const inactiveCount = useMemo(() => employees.filter((e) => !e.active).length, [employees]);
  // Fall back to "active" once nobody is left deactivated so the list never goes blank on a stale filter.
  const effectiveRosterFilter: RosterFilter = inactiveCount === 0 ? "active" : rosterFilter;

  const byBranch = useMemo(() => {
    const groups = new Map<string, EmployeeDetail[]>();
    for (const e of employees) {
      if (effectiveRosterFilter === "active" && !e.active) continue;
      if (effectiveRosterFilter === "inactive" && e.active) continue;
      const key = e.branchName || e.branchId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return groups;
  }, [employees, effectiveRosterFilter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["staff-targets"] });
    queryClient.invalidateQueries({ queryKey: ["staff-target-trends"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-dashboard"] });
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

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.reactivateEmployee(id),
    onSuccess: () => { invalidate(); closeDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const requestDeactivate = (employee: EmployeeDetail) => {
    if (window.confirm(t("deactivateConfirm", { name: employee.name }))) {
      setError("");
      deleteMutation.mutate(employee.id);
    }
  };

  const requestReactivate = (employee: EmployeeDetail) => {
    if (window.confirm(t("reactivateConfirm", { name: employee.name }))) {
      setError("");
      reactivateMutation.mutate(employee.id);
    }
  };

  const selectedEmployee = drawer && drawer.mode !== "create" ? drawer.employee : null;
  const selectedPerf = selectedEmployee ? perfByStaff.get(selectedEmployee.id) : null;
  const formLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminPageShell>
      <PageHeader
        title={t("title")}
        subtitle={`${tPeriods(dateRange.preset)} · ${t("subtitle")}`}
        action={
          <button
            type="button"
            onClick={() => setDrawer({ mode: "create" })}
            className={btnPrimarySm}
            aria-label={t("addEmployee")}
            data-testid="employees-add-button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("addEmployee")}</span>
          </button>
        }
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <ScopeFilterBar
        layout="card"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateTestId="admin-employees-date-range"
        branches={branches}
        selectedBranches={selectedBranches}
        onBranchesChange={setSelectedBranches}
      />

      <SegmentedControl
        options={[
          { id: "attendance" as const, label: t("tabs.attendance"), icon: CalendarDays },
          { id: "targets" as const, label: t("tabs.targets"), icon: Target },
          { id: "roster" as const, label: t("tabs.roster"), icon: Users },
        ]}
        value={sectionTab}
        onChange={setSectionTab}
      />

      {!branchesSelected ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranches")} />
      ) : (
        <DashboardOverviewShell>
          <div className="dashboard-overview-modules dashboard-overview-modules--nested">
            {sectionTab === "attendance" ? (
              <AttendanceDashboardSection
                variant="dashboard"
                data={attendanceDashboard}
                loading={attendanceLoading}
                startDate={dateRange.from}
                endDate={dateRange.to}
                branchIds={branchIdsFilter ?? selectedBranches}
                showPageHeader={false}
              />
            ) : sectionTab === "roster" ? (
              <>
                <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden">
                  <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
                    <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="dashboard-overview-section-title">{t("roster")}</h2>
                      <p className="dashboard-overview-section-hint">{t("rosterHint")}</p>
                    </div>
                  </div>
                  {inactiveCount > 0 ? (
                    <div className="px-3 pb-3 md:px-4">
                      <SegmentedControl
                        options={[
                          { id: "active" as const, label: tCommon("active") },
                          { id: "inactive" as const, label: `${tCommon("inactive")} (${inactiveCount})` },
                          { id: "all" as const, label: tCommon("all") },
                        ]}
                        value={effectiveRosterFilter}
                        onChange={setRosterFilter}
                      />
                    </div>
                  ) : null}
                  {isLoading ? (
                    <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingEmployees")}</p>
                  ) : employees.length === 0 ? (
                    <EmptyState
                      title={t("noEmployeesTitle")}
                      description={t("noEmployeesDesc")}
                      icon={Users}
                      action={
                        <button type="button" onClick={() => setDrawer({ mode: "create" })} className={btnPrimarySm}>
                          <Plus className="w-4 h-4" />
                          {t("addEmployee")}
                        </button>
                      }
                    />
                  ) : (
                    <div>
                      {Array.from(byBranch.entries()).map(([branchName, list]) => (
                        <div key={branchName}>
                          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-muted)]/50 md:px-4">
                            {branchName}
                          </p>
                          <div className="divide-y divide-[var(--border)]">
                            {list.map((e) => {
                              const perf = perfByStaff.get(e.id);
                              const isSelected = drawer && drawer.mode !== "create" && drawer.employee.id === e.id;
                              return (
                                <div key={e.id} className="flex items-center">
                                  <div className="min-w-0 flex-1">
                                    <ListRow
                                      title={e.name}
                                      subtitle={[e.role.replace("_", " "), e.salary != null ? t("perMonth", { amount: formatCurrency(e.salary) }) : null, perf ? t("ofTargetShort", { percent: perf.achievementPercent }) : null, !e.active && e.deactivatedAt ? t("deactivatedOn", { date: formatShortDate(e.deactivatedAt) }) : null].filter(Boolean).join(" · ")}
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
                                  </div>
                                  {e.active ? (
                                    <button
                                      type="button"
                                      onClick={() => requestDeactivate(e)}
                                      disabled={deleteMutation.isPending}
                                      className="hidden sm:inline-flex shrink-0 items-center gap-1 mr-3 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                      aria-label={`${tCommon("deactivate")} ${e.name}`}
                                      data-testid={`employee-deactivate-${e.id}`}
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      {tCommon("deactivate")}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => requestReactivate(e)}
                                      disabled={reactivateMutation.isPending}
                                      className="hidden sm:inline-flex shrink-0 items-center gap-1 mr-3 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                                      aria-label={`${t("reactivate")} ${e.name}`}
                                      data-testid={`employee-reactivate-${e.id}`}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      {t("reactivate")}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                <div className="dashboard-kpi-strip min-w-0 max-w-full">
                  <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
                    <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
                      <Target className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="dashboard-overview-section-title">{t("summaryLabel")}</h2>
                      {performance?.periodLabel ? (
                        <p className="dashboard-overview-section-hint">{performance.periodLabel}</p>
                      ) : null}
                    </div>
                  </div>
                  <CompactStatsStrip
                    loading={perfLoading}
                    testId="employees-targets-summary-strip"
                    items={[
                      {
                        id: "met",
                        label: t("meetingTarget"),
                        value: perfLoading ? "…" : String(performance?.meetingTargetCount ?? 0),
                        icon: CheckCircle2,
                        accent: "emerald",
                        featured: true,
                      },
                      {
                        id: "below",
                        label: t("belowTarget"),
                        value: perfLoading ? "…" : String(performance?.belowTargetCount ?? 0),
                        icon: AlertTriangle,
                        accent: "amber",
                      },
                      {
                        id: "active",
                        label: t("activeStaff"),
                        value: String(employees.filter((e) => e.active).length),
                        icon: Users,
                        accent: "violet",
                      },
                    ]}
                  />
                </div>

                <section className="dashboard-widget-card min-w-0 max-w-full overflow-hidden">
                  <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
                    <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
                      <Target className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="dashboard-overview-section-title">{t("monthlyPerformance")}</h2>
                      {performance?.periodLabel ? (
                        <p className="dashboard-overview-section-hint">{performance.periodLabel}</p>
                      ) : null}
                    </div>
                  </div>
                  {perfLoading ? (
                    <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingPerformance")}</p>
                  ) : !performance?.staff.length ? (
                    <EmptyState title={t("noTargetDataTitle")} description={t("noTargetDataDesc")} icon={Target} />
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
                          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-muted)]/50 md:px-4">
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
                </section>

                <EmployeeTargetCoachingPanel performance={performance} loading={perfLoading} variant="dashboard" />

                {!trendsLoading && targetTrends && targetTrends.branches.length > 0 && (
                  <EmployeeTargetTrends
                    branches={targetTrends.branches}
                    periodLabel={targetTrends.periodLabel}
                    compact
                    panelVariant="dashboard"
                  />
                )}

              </>
            )}
          </div>
        </DashboardOverviewShell>
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
          if (drawer && drawer.mode !== "create") requestDeactivate(drawer.employee);
        }}
        onReactivate={() => {
          if (drawer && drawer.mode !== "create") requestReactivate(drawer.employee);
        }}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        onStaffLoginUpdated={(updated) => {
          setDrawer((d) => {
            if (!d || d.mode === "create" || d.employee.id !== updated.id) return d;
            return { ...d, employee: { ...d.employee, ...updated } };
          });
          invalidate();
        }}
      />
    </AdminPageShell>
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
  onReactivate,
  onCreate,
  onUpdate,
  onStaffLoginUpdated,
}: {
  drawer: DrawerState | null;
  branches: { id: string; name: string }[];
  performance: StaffTargetPerformanceItem | null | undefined;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onCreate: (data: CreateEmployeeRequest) => void;
  onUpdate: (id: string, data: UpdateEmployeeRequest) => void;
  onStaffLoginUpdated: (employee: EmployeeDetail) => void;
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
            {employee.active ? (
              <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
                <Trash2 className="w-4 h-4" />
                {tCommon("deactivate")}
              </button>
            ) : (
              <button onClick={onReactivate} className={`${btnSecondary} flex-1`}>
                <RotateCcw className="w-4 h-4" />
                {t("reactivate")}
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {isView && employee && (
        <EmployeeDetailView employee={employee} performance={performance} onStaffLoginUpdated={onStaffLoginUpdated} />
      )}
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

function StaffLoginSection({
  employee,
  onUpdated,
}: {
  employee: EmployeeDetail;
  onUpdated: (employee: EmployeeDetail) => void;
}) {
  const t = useTranslations("admin.employees");
  const hasLogin = Boolean(employee.hasStaffLogin);
  const [email, setEmail] = useState(employee.staffLoginEmail ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [designation, setDesignation] = useState<StaffDesignation | "">(
    () => resolveStaffDesignation(employee.designation) || "",
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setEmail(employee.staffLoginEmail ?? "");
    setDesignation(resolveStaffDesignation(employee.designation) || "");
    setNewPassword("");
    setPassword("");
    setError("");
  }, [employee.id, employee.hasStaffLogin, employee.staffLoginEmail, employee.designation]);

  const provision = useMutation({
    mutationFn: () =>
      api.provisionStaffLogin(employee.id, {
        email,
        password,
        designation: designation || undefined,
      }),
    onSuccess: (updated) => {
      onUpdated(updated);
      setPassword("");
      setError("");
      setSuccess(t("staffLoginCreated"));
    },
    onError: (e) => {
      setSuccess("");
      setError(e instanceof Error ? e.message : t("staffLoginFailed"));
    },
  });

  const updateLogin = useMutation({
    mutationFn: () => {
      const payload: { email?: string; password?: string; designation?: string } = {};
      const trimmedEmail = email.trim();
      if (trimmedEmail && trimmedEmail !== employee.staffLoginEmail) {
        payload.email = trimmedEmail;
      }
      if (newPassword.length >= 6) {
        payload.password = newPassword;
      }
      const des = designation || undefined;
      if (des && des !== employee.designation) {
        payload.designation = des;
      }
      return api.updateStaffLogin(employee.id, payload);
    },
    onSuccess: (updated) => {
      onUpdated(updated);
      setNewPassword("");
      setError("");
      setSuccess(t("staffLoginUpdated"));
    },
    onError: (e) => {
      setSuccess("");
      setError(e instanceof Error ? e.message : t("staffLoginUpdateFailed"));
    },
  });

  const canUpdate =
    hasLogin &&
    ((email.trim() && email.trim() !== (employee.staffLoginEmail ?? "")) ||
      newPassword.length >= 6 ||
      (designation && designation !== resolveStaffDesignation(employee.designation)));

  if (hasLogin) {
    return (
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-emerald-950">{t("staffLoginActive")}</p>
          <p className="text-xs text-emerald-900/80 mt-0.5">{t("staffLoginActiveHint")}</p>
        </div>
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        {success && <AlertBanner variant="success">{success}</AlertBanner>}
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          {t("staffLoginEmailLabel")}
          <input
            type="email"
            className={`${inputClass} mt-1`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSuccess("");
            }}
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          {t("staffLoginPasswordLabel")}
          <input
            type="text"
            readOnly
            className={`${inputClass} mt-1 bg-[var(--surface-muted)] text-[var(--text-secondary)]`}
            value="••••••••"
            aria-label={t("staffLoginPasswordMasked")}
          />
          <p className="mt-1 text-[10px] font-medium text-[var(--text-tertiary)]">{t("staffLoginPasswordHint")}</p>
        </label>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          {t("staffLoginNewPassword")}
          <input
            type="password"
            autoComplete="new-password"
            className={`${inputClass} mt-1`}
            placeholder={t("staffLoginPassword")}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setSuccess("");
            }}
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          {t("designationLabel")}
          <select
            className={`${selectClass} mt-1 w-full`}
            value={designation}
            onChange={(e) => {
              setDesignation(e.target.value as StaffDesignation | "");
              setSuccess("");
            }}
          >
            <option value="">{t("designationSelectPlaceholder")}</option>
            {STAFF_DESIGNATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={btnPrimarySm}
          disabled={!canUpdate || updateLogin.isPending}
          onClick={() => updateLogin.mutate()}
        >
          {updateLogin.isPending ? t("updatingStaffLogin") : t("updateStaffLogin")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{t("staffAppLogin")}</p>
      <p className="text-xs text-[var(--text-secondary)]">{t("staffAppLoginHint")}</p>
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}
      <input
        type="email"
        className={inputClass}
        placeholder={t("staffLoginEmail")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className={inputClass}
        placeholder={t("staffLoginPassword")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <label className="block text-xs font-semibold text-[var(--text-secondary)]">
        {t("designationLabel")}
        <select
          className={`${selectClass} mt-1 w-full`}
          value={designation}
          onChange={(e) => setDesignation(e.target.value as StaffDesignation | "")}
        >
          <option value="">{t("designationSelectPlaceholder")}</option>
          {STAFF_DESIGNATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={btnPrimarySm}
        disabled={!email || password.length < 6 || !designation || provision.isPending}
        onClick={() => provision.mutate()}
      >
        {provision.isPending ? t("creatingLogin") : t("createStaffLogin")}
      </button>
    </div>
  );
}

function EmployeeDetailView({
  employee,
  performance,
  onStaffLoginUpdated,
}: {
  employee: EmployeeDetail;
  performance: StaffTargetPerformanceItem | null | undefined;
  onStaffLoginUpdated: (employee: EmployeeDetail) => void;
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

      <StaffLoginSection employee={employee} onUpdated={onStaffLoginUpdated} />

      <SectionTitle>{tAdmin("profile")}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label={tCommon("phone")} value={employee.phone} />
        <DetailField label={tCommon("branch")} value={employee.branchName} />
        <DetailField label={t("skills")} value={employee.skills} />
        <DetailField label={t("biometricId")} value={employee.biometricId} />
        <DetailField
          label={tCommon("status")}
          value={
            employee.active
              ? tCommon("active")
              : employee.deactivatedAt
                ? `${tCommon("inactive")} · ${t("deactivatedOn", { date: formatShortDate(employee.deactivatedAt) })}`
                : tCommon("inactive")
          }
        />
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
