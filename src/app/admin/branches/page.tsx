"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, Pencil, Plus, Target, Trash2, UserPlus, Users } from "lucide-react";
import {
  api,
  Branch,
  CreateBranchRequest,
  CreatePlatformUserRequest,
  PlatformUser,
  UpdateBranchRequest,
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
const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_SUPER_ADMIN: "Platform Admin",
  BRAND_ADMIN: "Brand Admin (CEO)",
  BRANCH_MANAGER: "Branch Manager",
  SALON_MANAGER: "Salon Manager",
};

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
        title="Organization"
        subtitle="Brand profile, branches & manager accounts"
        action={
          tab === "branches" ? (
            <button onClick={() => setBranchDrawer({ mode: "create" })} className={`${btnPrimary} py-2.5 px-4 shrink-0`}>
              <Plus className="w-4 h-4" />
              Add branch
            </button>
          ) : tab === "managers" ? (
            <button onClick={() => setManagerDrawer({ mode: "create" })} className={`${btnPrimary} py-2.5 px-4 shrink-0`}>
              <UserPlus className="w-4 h-4" />
              Onboard manager
            </button>
          ) : undefined
        }
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <SegmentedControl
        options={[
          { id: "brand" as Tab, label: "Brand", icon: Building2 },
          { id: "branches" as Tab, label: "Branches", icon: Building2 },
          { id: "managers" as Tab, label: "Managers", icon: Users },
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
              label="Branches meeting target"
              value={perfLoading ? "…" : (branchPerformance?.meetingTargetCount ?? 0)}
              icon={Target}
              accent="emerald"
            />
            <StatCard
              label="Branches below target"
              value={perfLoading ? "…" : (branchPerformance?.belowTargetCount ?? 0)}
              icon={Target}
              accent="amber"
            />
          </div>

          <Card padding={false}>
            <div className="px-4 py-3.5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--brand-text)]" />
                Monthly branch targets
                {branchPerformance?.periodLabel && (
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    · {branchPerformance.periodLabel}
                  </span>
                )}
              </h2>
            </div>
            {perfLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">Loading performance...</p>
            ) : !branchPerformance?.branches.length ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">No branch target data</p>
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
                          ? `${formatCurrency(p.actualSales)} of ${formatCurrency(p.monthlySalesTarget)} · ${p.achievementPercent}%`
                          : "No monthly target set"
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
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">All branches</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Tap a branch to view details</p>
            </div>
            {branchesLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">Loading branches...</p>
            ) : branches.length === 0 ? (
              <EmptyState title="No branches" description="Add your first branch location" />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {branches.map((b) => {
                  const perf = perfByBranch.get(b.id);
                  const isSelected = branchDrawer && branchDrawer.mode !== "create" && branchDrawer.branch.id === b.id;
                  return (
                    <ListRow
                      key={b.id}
                      title={b.name}
                      subtitle={[
                        b.code,
                        b.societyDefault,
                        b.monthlySalesTarget ? `Target ${formatCurrency(b.monthlySalesTarget)}/mo` : null,
                        perf && perf.monthlySalesTarget > 0 ? `${perf.achievementPercent}% achieved` : null,
                      ].filter(Boolean).join(" · ")}
                      onClick={() => setBranchDrawer({ mode: "view", branch: b })}
                      trailing={
                        <div className="flex items-center gap-2">
                          <StatusBadge status={b.status || "ACTIVE"} />
                          <ChevronRight className={cn("w-4 h-4", isSelected ? "text-[var(--brand-text)]" : "text-[var(--text-tertiary)]")} />
                        </div>
                      }
                    />
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
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">Manager accounts</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Tap an account to view details</p>
          </div>
          {managersLoading ? (
            <p className="p-4 text-sm text-[var(--text-secondary)]">Loading managers...</p>
          ) : managers.length === 0 ? (
            <EmptyState title="No manager accounts" description="Onboard branch managers to log in" />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {managers.map((u) => {
                const isSelected = managerDrawer && managerDrawer.mode !== "create" && managerDrawer.manager.id === u.id;
                return (
                  <ListRow
                    key={u.id}
                    title={u.name}
                    subtitle={`${u.email} · ${ROLE_LABELS[u.role]}${u.branchName ? ` · ${u.branchName}` : ""}`}
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
          if (branchDrawer && branchDrawer.mode !== "create" && window.confirm(`Deactivate branch "${branchDrawer.branch.name}"?`)) {
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
            window.confirm(`Deactivate "${managerDrawer.manager.name}"?`)) {
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
  const cls = meeting
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : onTrack
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  const label = meeting ? "Target met" : onTrack ? "On track" : "Behind";
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
  if (loading) {
    return <Card><p className="text-sm text-[var(--text-secondary)]">Loading brand...</p></Card>;
  }

  return (
    <Card padding={false}>
      <ListRow
        title={tenant?.name ?? "Brand"}
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
  if (!drawer) return null;

  const branch = drawer.mode !== "create" ? drawer.branch : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";

  const title = drawer.mode === "create" ? "New branch" : drawer.mode === "edit" ? "Edit branch" : branch?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? "Add a location with monthly sales target"
      : drawer.mode === "edit"
        ? "Update branch profile & targets"
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
              Edit branch
            </button>
            <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
              <Trash2 className="w-4 h-4" />
              Deactivate
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
          cancelLabel={drawer.mode === "edit" ? "Back to details" : "Cancel"}
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
  return (
    <div className="space-y-5">
      {performance && performance.monthlySalesTarget > 0 && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/40">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">This month</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(performance.actualSales)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                of {formatCurrency(performance.monthlySalesTarget)} target ({performance.achievementPercent}%)
              </p>
            </div>
            <BranchTargetBadge meeting={performance.meetingTarget} onTrack={performance.onTrack} />
          </div>
        </div>
      )}

      <SectionTitle>Profile</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Code" value={branch.code} />
        <DetailField label="Status" value={branch.status || "ACTIVE"} />
        <DetailField label="Society / locality" value={branch.societyDefault} />
        <DetailField label="Phone" value={branch.phone} />
        <DetailField label="Address" value={branch.address} />
        <DetailField label="GSTIN" value={branch.gstin} />
        <DetailField label="Open time" value={branch.openTime} />
        <DetailField label="Close time" value={branch.closeTime} />
      </div>

      <SectionTitle>Targets</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField
          label="Monthly sales target"
          value={branch.monthlySalesTarget != null ? formatCurrency(branch.monthlySalesTarget) : undefined}
        />
      </div>
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
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [societyDefault, setSocietyDefault] = useState(initial?.societyDefault ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [gstin, setGstin] = useState(initial?.gstin ?? "");
  const [monthlySalesTarget, setMonthlySalesTarget] = useState(
    initial?.monthlySalesTarget?.toString() ?? ""
  );

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
          monthlySalesTarget: monthlySalesTarget ? Number(monthlySalesTarget) : undefined,
        });
      }}
      className="space-y-4 pb-2"
    >
      <SectionTitle>Profile</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Code *">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            className={inputClass}
            disabled={!!initial}
            required
          />
        </Field>
        <Field label="Society / locality">
          <input value={societyDefault} onChange={(e) => setSocietyDefault(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label="GSTIN">
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Monthly sales target (₹)">
          <input
            type="number"
            min={0}
            value={monthlySalesTarget}
            onChange={(e) => setMonthlySalesTarget(e.target.value)}
            className={inputClass}
            placeholder="e.g. 400000"
          />
        </Field>
      </div>
      <div className="flex gap-2 pt-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--surface)]">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>{cancelLabel}</button>
        <button type="submit" disabled={!name || !code || loading} className={`${btnPrimary} flex-1`}>
          {loading ? "Saving…" : initial ? "Save changes" : "Create branch"}
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
  if (!drawer) return null;

  const manager = drawer.mode !== "create" ? drawer.manager : null;
  const isView = drawer.mode === "view";
  const isForm = drawer.mode === "create" || drawer.mode === "edit";
  const canEdit = manager?.role !== "BRAND_ADMIN";

  const title = drawer.mode === "create" ? "Onboard manager" : drawer.mode === "edit" ? "Edit manager" : manager?.name ?? "";
  const subtitle =
    drawer.mode === "create"
      ? "Create a login for branch or brand management"
      : drawer.mode === "edit"
        ? "Update account details"
        : [manager?.email, manager?.role && ROLE_LABELS[manager.role]].filter(Boolean).join(" · ");

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
              Edit account
            </button>
            <button onClick={onDeactivate} className={`${btnSecondary} flex-1 text-red-600 border-red-200 hover:bg-red-50`}>
              <Trash2 className="w-4 h-4" />
              Deactivate
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
          cancelLabel={drawer.mode === "edit" ? "Back to details" : "Cancel"}
        />
      )}
    </SideSheet>
  );
}

function ManagerDetailView({ manager }: { manager: PlatformUser }) {
  return (
    <div className="space-y-5">
      <SectionTitle>Account</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Email" value={manager.email} />
        <DetailField label="Role" value={ROLE_LABELS[manager.role]} />
        <DetailField label="Branch" value={manager.branchName} />
        <DetailField label="Status" value={manager.active ? "Active" : "Inactive"} />
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
      <SectionTitle>Account</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Email *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </Field>
        <Field label={isCreate ? "Password *" : "New password"}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required={isCreate}
            minLength={isCreate ? 6 : undefined}
            placeholder={isCreate ? undefined : "Leave blank to keep current"}
          />
        </Field>
        <Field label="Role *">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={selectClass}
            disabled={!canEditRole && !isCreate}
          >
            {ONBOARD_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </Field>
        {needsBranch && (
          <Field label="Branch *">
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
          {loading ? "Saving…" : isCreate ? "Create account" : "Save changes"}
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
  if (!drawer) return null;

  const isView = drawer.mode === "view";

  return (
    <SideSheet
      open
      onClose={onClose}
      title={isView ? tenant?.name ?? "Brand profile" : "Edit brand profile"}
      subtitle={isView ? `${tenant?.slug} · ${tenant?.status}` : "Update brand name and theme color"}
      footer={
        isView ? (
          <button onClick={onEdit} className={`${btnPrimary} w-full`}>
            <Pencil className="w-4 h-4" />
            Edit brand profile
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading brand...</p>
      ) : isView && tenant ? (
        <div className="space-y-5">
          <SectionTitle>Brand</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Name" value={tenant.name} />
            <DetailField label="Slug" value={tenant.slug} />
            <DetailField label="Status" value={tenant.status} />
            <DetailField
              label="Primary color"
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
        <Field label="Brand name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Primary color">
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
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>Back to details</button>
        <button type="submit" disabled={saving || !name} className={`${btnPrimary} flex-1`}>
          {saving ? "Saving…" : "Save brand profile"}
        </button>
      </div>
    </form>
  );
}
