"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, MapPin, Pencil, Plus, Target, Trash2, UserPlus, Users } from "lucide-react";
import {
  api,
  Branch,
  CreateBranchRequest,
  CreatePlatformUserRequest,
  PlatformUser,
  UpdateBranchRequest,
  UpdateBranchGeofenceRequest,
  UpdatePlatformUserRequest,
  UpdateTenantRequest,
  UserRole,
} from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import {
  PageHeader,
  Card,
  StatCard,
  SegmentedControl,
  ListRow,
  EmptyState,
  AlertBanner,
  StatusBadge,
  SideSheet,
  DetailField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

type Tab = "brand" | "branches" | "managers";

type BranchDrawerState = { mode: "create" } | { mode: "view" | "edit"; branch: Branch };
type ManagerDrawerState = { mode: "create" } | { mode: "view" | "edit"; manager: PlatformUser };
type BrandDrawerState = { mode: "view" | "edit" };

const ONBOARD_ROLES: UserRole[] = ["BRAND_ADMIN", "BRANCH_MANAGER", "SALON_MANAGER"];

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

export default function AdminBranchesPage() {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("brand");
  const [error, setError] = useState("");
  const [branchDrawer, setBranchDrawer] = useState<BranchDrawerState | null>(null);
  const [managerDrawer, setManagerDrawer] = useState<ManagerDrawerState | null>(null);
  const [brandDrawer, setBrandDrawer] = useState<BrandDrawerState | null>(null);

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getTenant(),
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  const { data: managers = [], isLoading: managersLoading } = useQuery({
    queryKey: ["brand-users"],
    queryFn: () => api.getBrandUsers(),
  });

  const range = monthRange();
  const { data: branchPerformance, isLoading: perfLoading } = useQuery({
    queryKey: ["branch-targets", range.start, range.end],
    queryFn: () =>
      api.getBranchTargetPerformance({ startDate: range.start, endDate: range.end }),
    enabled: tab === "branches",
  });

  const perfByBranch = new Map(
    branchPerformance?.branches.map((b) => [b.branchId, b]) ?? []
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["branch-targets"] });
    queryClient.invalidateQueries({ queryKey: ["tenant"] });
    queryClient.invalidateQueries({ queryKey: ["brand-users"] });
  };

  const closeBranchDrawer = () => setBranchDrawer(null);
  const closeManagerDrawer = () => setManagerDrawer(null);
  const closeBrandDrawer = () => setBrandDrawer(null);

  const updateTenantMutation = useMutation({
    mutationFn: (data: UpdateTenantRequest) => api.updateTenant(data),
    onSuccess: () => { invalidate(); closeBrandDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: CreateBranchRequest) => api.createBranch(data),
    onSuccess: () => { invalidate(); closeBranchDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchRequest }) =>
      api.updateBranch(id, data),
    onSuccess: () => { invalidate(); closeBranchDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateBranchMutation = useMutation({
    mutationFn: (id: string) => api.deactivateBranch(id),
    onSuccess: () => { invalidate(); closeBranchDrawer(); },
    onError: (e: Error) => setError(e.message),
  });

  const createManagerMutation = useMutation({
    mutationFn: (data: CreatePlatformUserRequest) => api.createBrandUser(data),
    onSuccess: () => { invalidate(); closeManagerDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const updateManagerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlatformUserRequest }) =>
      api.updateBrandUser(id, data),
    onSuccess: () => { invalidate(); closeManagerDrawer(); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateManagerMutation = useMutation({
    mutationFn: (id: string) => api.deactivateBrandUser(id),
    onSuccess: () => { invalidate(); closeManagerDrawer(); },
    onError: (e: Error) => setError(e.message),
  });

  const activeBranches = branches.filter((b) => b.status !== "INACTIVE");
  const selectedBranch = branchDrawer && branchDrawer.mode !== "create" ? branchDrawer.branch : null;
  const selectedBranchPerf = selectedBranch ? perfByBranch.get(selectedBranch.id) : null;

  const branchFormLoading = createBranchMutation.isPending || updateBranchMutation.isPending;
  const managerFormLoading = createManagerMutation.isPending || updateManagerMutation.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          tab === "branches" ? (
            <button onClick={() => setBranchDrawer({ mode: "create" })} className={`${btnPrimary} py-2.5 px-4 shrink-0`}>
              <Plus className="w-4 h-4" />
              {t("addBranch")}
            </button>
          ) : tab === "managers" ? (
            <button onClick={() => setManagerDrawer({ mode: "create" })} className={`${btnPrimary} py-2.5 px-4 shrink-0`}>
              <UserPlus className="w-4 h-4" />
              {t("onboardManager")}
            </button>
          ) : undefined
        }
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <SegmentedControl
        options={[
          { id: "brand" as Tab, label: t("tabs.brand"), icon: Building2 },
          { id: "branches" as Tab, label: t("tabs.branches"), icon: Building2 },
          { id: "managers" as Tab, label: t("tabs.managers"), icon: Users },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "brand" && (
        <BrandSummaryCard
          tenant={tenant}
          loading={tenantLoading}
          onView={() => setBrandDrawer({ mode: "view" })}
        />
      )}

      {tab === "branches" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("meetingTarget")}
              value={perfLoading ? "…" : (branchPerformance?.meetingTargetCount ?? 0)}
              icon={Target}
              accent="emerald"
            />
            <StatCard
              label={t("belowTarget")}
              value={perfLoading ? "…" : (branchPerformance?.belowTargetCount ?? 0)}
              icon={Target}
              accent="amber"
            />
          </div>

          <Card padding={false}>
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--brand-text)]" />
                {t("monthlyTargets")}
                {branchPerformance?.periodLabel && (
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    · {branchPerformance.periodLabel}
                  </span>
                )}
              </h2>
            </div>
            {perfLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingPerformance")}</p>
            ) : !branchPerformance?.branches.length ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{t("noTargetData")}</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {branchPerformance.branches.map((p) => {
                  const branch = branches.find((b) => b.id === p.branchId);
                  return (
                    <ListRow
                      key={p.branchId}
                      title={p.branchName}
                      subtitle={
                        p.monthlySalesTarget > 0
                          ? t("salesOfTarget", {
                              actual: formatCurrency(p.actualSales),
                              target: formatCurrency(p.monthlySalesTarget),
                              percent: p.achievementPercent,
                            })
                          : t("noMonthlyTarget")
                      }
                      onClick={() => branch && setBranchDrawer({ mode: "view", branch })}
                      trailing={
                        <div className="flex items-center gap-2">
                          {p.monthlySalesTarget > 0 && (
                            <BranchTargetBadge meeting={p.meetingTarget} onTrack={p.onTrack} />
                          )}
                          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Card>

          <Card padding={false}>
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("allBranches")}</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{t("tapBranch")}</p>
            </div>
            {branchesLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingBranches")}</p>
            ) : branches.length === 0 ? (
              <EmptyState title={t("noBranchesTitle")} description={t("noBranchesDesc")} />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {branches.map((b) => {
                  const perf = perfByBranch.get(b.id);
                  const isSelected = branchDrawer && branchDrawer.mode !== "create" && branchDrawer.branch.id === b.id;
                  return (
                    <div key={b.id} data-testid="branch-list-row">
                    <ListRow
                      title={b.name}
                      subtitle={[
                        b.code,
                        b.societyDefault,
                        b.monthlySalesTarget ? t("targetPerMonth", { amount: formatCurrency(b.monthlySalesTarget) }) : null,
                        perf && perf.monthlySalesTarget > 0 ? t("achieved", { percent: perf.achievementPercent }) : null,
                      ].filter(Boolean).join(" · ")}
                      onClick={() => setBranchDrawer({ mode: "view", branch: b })}
                      trailing={
                        <div className="flex items-center gap-2">
                          <StatusBadge status={b.status || "ACTIVE"} />
                          <ChevronRight className={cn("w-4 h-4", isSelected ? "text-[var(--brand-text)]" : "text-[var(--text-tertiary)]")} />
                        </div>
                      }
                    />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "managers" && (
        <Card padding={false}>
          <div className="px-4 py-3.5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("managerAccounts")}</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{t("tapAccount")}</p>
          </div>
          {managersLoading ? (
            <p className="p-4 text-sm text-[var(--text-secondary)]">{t("loadingManagers")}</p>
          ) : managers.length === 0 ? (
            <EmptyState title={t("noManagersTitle")} description={t("noManagersDesc")} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {managers.map((u) => {
                const isSelected = managerDrawer && managerDrawer.mode !== "create" && managerDrawer.manager.id === u.id;
                return (
                  <ListRow
                    key={u.id}
                    title={u.name}
                    subtitle={`${u.email} · ${t(`roles.${u.role}`)}${u.branchName ? ` · ${u.branchName}` : ""}`}
                    onClick={() => setManagerDrawer({ mode: "view", manager: u })}
                    trailing={
                      <div className="flex items-center gap-2">
                        <StatusBadge status={u.active ? "ACTIVE" : "INACTIVE"} />
                        <ChevronRight className={cn("w-4 h-4", isSelected ? "text-[var(--brand-text)]" : "text-[var(--text-tertiary)]")} />
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </Card>
      )}

      <BranchDrawer
        drawer={branchDrawer}
        performance={selectedBranchPerf}
        loading={branchFormLoading}
        onClose={closeBranchDrawer}
        onEdit={() => branchDrawer && branchDrawer.mode === "view" && setBranchDrawer({ mode: "edit", branch: branchDrawer.branch })}
        onBackToView={() => branchDrawer && branchDrawer.mode === "edit" && setBranchDrawer({ mode: "view", branch: branchDrawer.branch })}
        onDeactivate={() => {
          if (branchDrawer && branchDrawer.mode !== "create" && window.confirm(t("deactivateBranchConfirm", { name: branchDrawer.branch.name }))) {
            deactivateBranchMutation.mutate(branchDrawer.branch.id);
          }
        }}
        onCreate={(data) => createBranchMutation.mutate(data)}
        onUpdate={(id, data) => updateBranchMutation.mutate({ id, data })}
      />

      <ManagerDrawer
        drawer={managerDrawer}
        branches={activeBranches}
        loading={managerFormLoading}
        onClose={closeManagerDrawer}
        onEdit={() => managerDrawer && managerDrawer.mode === "view" && setManagerDrawer({ mode: "edit", manager: managerDrawer.manager })}
        onBackToView={() => managerDrawer && managerDrawer.mode === "edit" && setManagerDrawer({ mode: "view", manager: managerDrawer.manager })}
        onDeactivate={() => {
          if (managerDrawer && managerDrawer.mode !== "create" && managerDrawer.manager.role !== "BRAND_ADMIN" && managerDrawer.manager.active &&
            window.confirm(t("deactivateManagerConfirm", { name: managerDrawer.manager.name }))) {
            deactivateManagerMutation.mutate(managerDrawer.manager.id);
          }
        }}
        onCreate={(data) => createManagerMutation.mutate(data)}
        onUpdate={(id, data) => updateManagerMutation.mutate({ id, data })}
      />

      <BrandDrawer
        drawer={brandDrawer}
        tenant={tenant}
        loading={tenantLoading}
        saving={updateTenantMutation.isPending}
        onClose={closeBrandDrawer}
        onEdit={() => setBrandDrawer({ mode: "edit" })}
        onBackToView={() => setBrandDrawer({ mode: "view" })}
        onSave={(data) => updateTenantMutation.mutate(data)}
      />
    </div>
  );
}

function BranchTargetBadge({ meeting, onTrack }: { meeting: boolean; onTrack: boolean }) {
  const tAdmin = useTranslations("admin.common");
  const cls = meeting
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : onTrack
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  const label = meeting ? tAdmin("targetMet") : onTrack ? tAdmin("onTrack") : tAdmin("behind");
  return (
    <span className={cn("text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border", cls)}>
      {label}
    </span>
  );
}

function BrandSummaryCard({
  tenant,
  loading,
  onView,
}: {
  tenant?: { name: string; slug: string; primaryColor?: string; status: string };
  loading: boolean;
  onView: () => void;
}) {
  const t = useTranslations("admin.organization");
  if (loading) {
    return <Card><p className="text-sm text-[var(--text-secondary)]">{t("loadingBrand")}</p></Card>;
  }

  return (
    <Card padding={false}>
      <ListRow
        title={tenant?.name ?? t("brand")}
        subtitle={`${tenant?.slug ?? "—"} · ${tenant?.status ?? "—"}`}
        onClick={onView}
        trailing={
          <div className="flex items-center gap-2">
            {tenant?.primaryColor && (
              <div className="w-6 h-6 rounded-lg border border-[var(--border)]" style={{ backgroundColor: tenant.primaryColor }} />
            )}
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
        }
      />
    </Card>
  );
}

function BranchDrawer({
  drawer,
  performance,
  loading,
  onClose,
  onEdit,
  onBackToView,
  onDeactivate,
  onCreate,
  onUpdate,
}: {
  drawer: BranchDrawerState | null;
  performance?: { actualSales: number; monthlySalesTarget: number; achievementPercent: number; meetingTarget: boolean; onTrack: boolean } | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onDeactivate: () => void;
  onCreate: (data: CreateBranchRequest) => void;
  onUpdate: (id: string, data: UpdateBranchRequest) => void;
}) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  if (!drawer) return null;

  const branch = drawer.mode !== "create" ? drawer.branch : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";

  const title = drawer.mode === "create" ? t("newBranch") : drawer.mode === "edit" ? t("editBranch") : branch?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? t("newBranchSubtitle")
      : drawer.mode === "edit"
        ? t("editBranchSubtitle")
        : [branch?.code, branch?.societyDefault].filter(Boolean).join(" · ");

  return (
    <SideSheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      wide
      footer={
        isView && branch && branch.status !== "INACTIVE" ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={onEdit} className={`${btnPrimary} flex-1`}>
              <Pencil className="w-4 h-4" />
              {t("editBranchBtn")}
            </button>
            <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
              <Trash2 className="w-4 h-4" />
              {tCommon("deactivate")}
            </button>
          </div>
        ) : undefined
      }
    >
      {isView && branch && <BranchDetailView branch={branch} performance={performance} />}
      {isForm && (
        <BranchForm
          key={drawer.mode === "create" ? "create" : branch!.id}
          initial={branch}
          loading={loading}
          onCancel={() => {
            if (drawer.mode === "edit") onBackToView();
            else onClose();
          }}
          onSubmit={(data) => {
            if (drawer.mode === "create") onCreate(data as CreateBranchRequest);
            else if (branch) onUpdate(branch.id, data);
          }}
          cancelLabel={drawer.mode === "edit" ? tAdmin("backToDetails") : tCommon("cancel")}
        />
      )}
    </SideSheet>
  );
}

function BranchDetailView({
  branch,
  performance,
}: {
  branch: Branch;
  performance?: { actualSales: number; monthlySalesTarget: number; achievementPercent: number; meetingTarget: boolean; onTrack: boolean } | null;
}) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-5">
      {performance && performance.monthlySalesTarget > 0 && (
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
            <BranchTargetBadge meeting={performance.meetingTarget} onTrack={performance.onTrack} />
          </div>
        </div>
      )}

      <SectionTitle>{tAdmin("profile")}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label={t("code")} value={branch.code} />
        <DetailField label={tCommon("status")} value={branch.status || "ACTIVE"} />
        <DetailField label={t("societyLocality")} value={branch.societyDefault} />
        <DetailField label={tCommon("phone")} value={branch.phone} />
        <DetailField label={t("address")} value={branch.address} />
        <DetailField label={t("gstin")} value={branch.gstin} />
        <DetailField label={t("openTime")} value={branch.openTime} />
        <DetailField label={t("closeTime")} value={branch.closeTime} />
      </div>

      <SectionTitle>{tAdmin("targets")}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField
          label={t("monthlySalesTarget")}
          value={branch.monthlySalesTarget != null ? formatCurrency(branch.monthlySalesTarget) : undefined}
        />
      </div>

      <BranchGeofencePanel branch={branch} />
    </div>
  );
}

function BranchGeofencePanel({ branch }: { branch: Branch }) {
  const t = useTranslations("admin.organization");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [latitude, setLatitude] = useState(branch.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(branch.longitude?.toString() ?? "");
  const [radius, setRadius] = useState(branch.geofenceRadiusMeters?.toString() ?? "150");
  const [grace, setGrace] = useState(branch.attendanceGraceMinutes?.toString() ?? "15");

  useEffect(() => {
    setLatitude(branch.latitude?.toString() ?? "");
    setLongitude(branch.longitude?.toString() ?? "");
    setRadius(branch.geofenceRadiusMeters?.toString() ?? "150");
    setGrace(branch.attendanceGraceMinutes?.toString() ?? "15");
  }, [branch]);

  const geofenceMutation = useMutation({
    mutationFn: (data: UpdateBranchGeofenceRequest) => api.updateBranchGeofence(branch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setEditing(false);
    },
  });

  function captureLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(String(pos.coords.latitude));
      setLongitude(String(pos.coords.longitude));
    });
  }

  return (
    <div className="space-y-3" data-testid="branch-geofence-panel">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>{t("geofenceTitle")}</SectionTitle>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-[var(--brand-text)]">
            {tCommon("edit")}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 gap-4">
          <DetailField label={t("latitude")} value={branch.latitude?.toFixed(6)} />
          <DetailField label={t("longitude")} value={branch.longitude?.toFixed(6)} />
          <DetailField label={t("geofenceRadius")} value={branch.geofenceRadiusMeters ? `${branch.geofenceRadiusMeters}m` : undefined} />
          <DetailField label={t("attendanceGrace")} value={branch.attendanceGraceMinutes != null ? `${branch.attendanceGraceMinutes} min` : undefined} />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            geofenceMutation.mutate({
              latitude: Number(latitude),
              longitude: Number(longitude),
              geofenceRadiusMeters: radius ? Number(radius) : undefined,
              attendanceGraceMinutes: grace ? Number(grace) : undefined,
            });
          }}
          className="space-y-3"
        >
          <button type="button" onClick={captureLocation} className={`${btnSecondary} w-full text-sm`}>
            <MapPin className="w-4 h-4" />
            {t("useMyLocation")}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("latitude")}>
              <input value={latitude} onChange={(e) => setLatitude(e.target.value)} className={inputClass} required type="number" step="any" />
            </Field>
            <Field label={t("longitude")}>
              <input value={longitude} onChange={(e) => setLongitude(e.target.value)} className={inputClass} required type="number" step="any" />
            </Field>
            <Field label={t("geofenceRadius")}>
              <input value={radius} onChange={(e) => setRadius(e.target.value)} className={inputClass} type="number" min={50} max={500} />
            </Field>
            <Field label={t("attendanceGrace")}>
              <input value={grace} onChange={(e) => setGrace(e.target.value)} className={inputClass} type="number" min={0} max={120} />
            </Field>
          </div>
          {geofenceMutation.error && (
            <AlertBanner variant="error">{(geofenceMutation.error as Error).message}</AlertBanner>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className={`${btnSecondary} flex-1`}>
              {tCommon("cancel")}
            </button>
            <button type="submit" disabled={geofenceMutation.isPending} className={`${btnPrimary} flex-1`}>
              {geofenceMutation.isPending ? tCommon("saving") : t("saveGeofence")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function BranchForm({
  initial,
  loading,
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
}: {
  initial: Branch | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateBranchRequest | UpdateBranchRequest) => void;
  cancelLabel?: string;
}) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [societyDefault, setSocietyDefault] = useState(initial?.societyDefault ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [gstin, setGstin] = useState(initial?.gstin ?? "");
  const [monthlySalesTarget, setMonthlySalesTarget] = useState(
    initial?.monthlySalesTarget?.toString() ?? ""
  );
  const [openTime, setOpenTime] = useState(initial?.openTime ?? "09:00");
  const [closeTime, setCloseTime] = useState(initial?.closeTime ?? "21:00");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          code,
          address: address || undefined,
          societyDefault: societyDefault || undefined,
          phone: phone || undefined,
          gstin: gstin || undefined,
          openTime: openTime || undefined,
          closeTime: closeTime || undefined,
          monthlySalesTarget: monthlySalesTarget ? Number(monthlySalesTarget) : undefined,
        });
      }}
      className="space-y-4 pb-2"
    >
      <SectionTitle>{tAdmin("profile")}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={`${tCommon("name")} *`}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label={`${t("code")} *`}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            className={inputClass}
            disabled={!!initial}
            required
          />
        </Field>
        <Field label={t("societyLocality")}>
          <input value={societyDefault} onChange={(e) => setSocietyDefault(e.target.value)} className={inputClass} />
        </Field>
        <Field label={tCommon("phone")}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("address")}>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("gstin")}>
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("openTime")}>
          <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("closeTime")}>
          <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("monthlySalesTargetField")}>
          <input
            type="number"
            min={0}
            value={monthlySalesTarget}
            onChange={(e) => setMonthlySalesTarget(e.target.value)}
            className={inputClass}
            placeholder={t("targetPlaceholder")}
          />
        </Field>
      </div>
      <div className="flex gap-2 pt-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--surface)]">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>{cancelLabel}</button>
        <button type="submit" disabled={!name || !code || loading} className={`${btnPrimary} flex-1`}>
          {loading ? tCommon("saving") : initial ? tAdmin("saveChanges") : t("createBranch")}
        </button>
      </div>
    </form>
  );
}

function ManagerDrawer({
  drawer,
  branches,
  loading,
  onClose,
  onEdit,
  onBackToView,
  onDeactivate,
  onCreate,
  onUpdate,
}: {
  drawer: ManagerDrawerState | null;
  branches: Branch[];
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onDeactivate: () => void;
  onCreate: (data: CreatePlatformUserRequest) => void;
  onUpdate: (id: string, data: UpdatePlatformUserRequest) => void;
}) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  if (!drawer) return null;

  const manager = drawer.mode !== "create" ? drawer.manager : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";
  const canEdit = manager?.role !== "BRAND_ADMIN";

  const title = drawer.mode === "create" ? t("onboardManagerTitle") : drawer.mode === "edit" ? t("editManagerTitle") : manager?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? t("onboardSubtitle")
      : drawer.mode === "edit"
        ? t("editManagerSubtitle")
        : [manager?.email, manager?.role && t(`roles.${manager.role}`)].filter(Boolean).join(" · ");

  return (
    <SideSheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      wide
      footer={
        isView && manager && manager.active && manager.role !== "BRAND_ADMIN" ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={onEdit} className={`${btnPrimary} flex-1`}>
              <Pencil className="w-4 h-4" />
              {t("editAccount")}
            </button>
            <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
              <Trash2 className="w-4 h-4" />
              {tCommon("deactivate")}
            </button>
          </div>
        ) : undefined
      }
    >
      {isView && manager && <ManagerDetailView manager={manager} />}
      {isForm && (
        <ManagerForm
          key={drawer.mode === "create" ? "create" : manager!.id}
          branches={branches}
          manager={manager}
          loading={loading}
          canEditRole={canEdit}
          onCancel={() => {
            if (drawer.mode === "edit") onBackToView();
            else onClose();
          }}
          onSubmit={(data) => {
            if (drawer.mode === "create") onCreate(data as CreatePlatformUserRequest);
            else if (manager) onUpdate(manager.id, data);
          }}
          cancelLabel={drawer.mode === "edit" ? tAdmin("backToDetails") : tCommon("cancel")}
        />
      )}
    </SideSheet>
  );
}

function ManagerDetailView({ manager }: { manager: PlatformUser }) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-5">
      <SectionTitle>{tAdmin("account")}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label={tCommon("email")} value={manager.email} />
        <DetailField label={t("role")} value={t(`roles.${manager.role}`)} />
        <DetailField label={tCommon("branch")} value={manager.branchName} />
        <DetailField label={tCommon("status")} value={manager.active ? tCommon("active") : tCommon("inactive")} />
      </div>
    </div>
  );
}

function ManagerForm({
  branches,
  manager,
  loading,
  canEditRole = true,
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
}: {
  branches: Branch[];
  manager: PlatformUser | null;
  loading: boolean;
  canEditRole?: boolean;
  onCancel: () => void;
  onSubmit: (data: CreatePlatformUserRequest | UpdatePlatformUserRequest) => void;
  cancelLabel?: string;
}) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(manager?.name ?? "");
  const [email, setEmail] = useState(manager?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(manager?.role ?? "SALON_MANAGER");
  const [branchId, setBranchId] = useState(manager?.branchId ?? branches[0]?.id ?? "");

  const needsBranch = role === "BRANCH_MANAGER" || role === "SALON_MANAGER";
  const isCreate = !manager;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isCreate) {
          onSubmit({
            name,
            email,
            password,
            role,
            branchId: needsBranch ? branchId : undefined,
          });
        } else {
          onSubmit({
            name,
            email,
            password: password || undefined,
            role: canEditRole ? role : undefined,
            branchId: needsBranch ? branchId : undefined,
          });
        }
      }}
      className="space-y-4 pb-2"
    >
      <SectionTitle>{tAdmin("account")}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={`${tCommon("name")} *`}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label={`${tCommon("email")} *`}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </Field>
        <Field label={isCreate ? `${t("password")} *` : t("newPassword")}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required={isCreate}
            minLength={isCreate ? 6 : undefined}
            placeholder={isCreate ? undefined : t("passwordPlaceholder")}
          />
        </Field>
        <Field label={`${t("role")} *`}>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={selectClass}
            disabled={!canEditRole && !isCreate}
          >
            {ONBOARD_ROLES.map((r) => (
              <option key={r} value={r}>{t(`roles.${r}`)}</option>
            ))}
          </select>
        </Field>
        {needsBranch && (
          <Field label={`${tCommon("branch")} *`}>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass} required>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <div className="flex gap-2 pt-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--surface)]">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>{cancelLabel}</button>
        <button
          type="submit"
          disabled={!name || !email || (isCreate && !password) || (needsBranch && !branchId) || loading}
          className={`${btnPrimary} flex-1`}
        >
          {loading ? tCommon("saving") : isCreate ? t("createAccount") : tAdmin("saveChanges")}
        </button>
      </div>
    </form>
  );
}

function BrandDrawer({
  drawer,
  tenant,
  loading,
  saving,
  onClose,
  onEdit,
  onBackToView,
  onSave,
}: {
  drawer: BrandDrawerState | null;
  tenant?: { name: string; slug: string; primaryColor?: string; status: string };
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onBackToView: () => void;
  onSave: (data: UpdateTenantRequest) => void;
}) {
  const t = useTranslations("admin.organization");
  const tCommon = useTranslations("common");
  if (!drawer) return null;

  const isView = drawer.mode === "view";

  return (
    <SideSheet
      open
      onClose={onClose}
      title={isView ? tenant?.name ?? t("brandProfile") : t("editBrandProfile")}
      subtitle={isView ? `${tenant?.slug} · ${tenant?.status}` : t("editBrandSubtitle")}
      footer={
        isView ? (
          <button onClick={onEdit} className={`${btnPrimary} w-full`}>
            <Pencil className="w-4 h-4" />
            {t("editBrandBtn")}
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("loadingBrand")}</p>
      ) : isView && tenant ? (
        <div className="space-y-5">
          <SectionTitle>{t("brand")}</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <DetailField label={tCommon("name")} value={tenant.name} />
            <DetailField label={t("slug")} value={tenant.slug} />
            <DetailField label={tCommon("status")} value={tenant.status} />
            <DetailField
              label={t("primaryColor")}
              value={
                tenant.primaryColor ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 rounded border border-[var(--border)]" style={{ backgroundColor: tenant.primaryColor }} />
                    {tenant.primaryColor}
                  </span>
                ) : undefined
              }
            />
          </div>
        </div>
      ) : (
        <BrandForm
          tenant={tenant}
          saving={saving}
          onCancel={onBackToView}
          onSave={onSave}
        />
      )}
    </SideSheet>
  );
}

function BrandForm({
  tenant,
  saving,
  onCancel,
  onSave,
}: {
  tenant?: { name: string; primaryColor?: string };
  saving: boolean;
  onCancel: () => void;
  onSave: (data: UpdateTenantRequest) => void;
}) {
  const t = useTranslations("admin.organization");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(tenant?.name ?? "");
  const [primaryColor, setPrimaryColor] = useState(tenant?.primaryColor || "#6366f1");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setPrimaryColor(tenant.primaryColor || "#6366f1");
    }
  }, [tenant]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, primaryColor });
      }}
      className="space-y-4 pb-2"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("brandName")}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label={t("primaryColor")}>
          <div className="flex gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-11 rounded-xl border border-[var(--border)] cursor-pointer"
            />
            <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputClass} />
          </div>
        </Field>
      </div>
      <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>{tAdmin("backToDetails")}</button>
        <button type="submit" disabled={saving || !name} className={`${btnPrimary} flex-1`}>
          {saving ? tCommon("saving") : t("saveBrandProfile")}
        </button>
      </div>
    </form>
  );
}
